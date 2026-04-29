import { useMemo } from "react";
import { Link } from "react-router-dom";
import { resolvePaperPreview } from "@/data/paperPreviews";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { PaperThumbnailPlaceholder } from "@/components/landing/PaperThumbnailPlaceholder";

export function ResultsPanel() {
  const { filteredPapers, filteredPaperCount, totalPaperCount } =
    useResearchFilter();

  const rows = useMemo(
    () => filteredPapers.map((p) => resolvePaperPreview(p)),
    [filteredPapers],
  );

  return (
    <section className="landing-panel landing-results">
      <h2 className="panel-title">Results</h2>
      <div className="panel-content landing-results-inner">
        <p className="landing-results-summary">
          <strong>{filteredPaperCount.toLocaleString()}</strong>
          {" papers match"}
          <span className="landing-results-out-of">
            {" "}
            (of {totalPaperCount.toLocaleString()} total)
          </span>
        </p>

        <ul className="results-paper-list" aria-label="Matching papers">
          {rows.map((paper) => (
            <li key={paper.id} className="results-paper-item">
              <Link
                to={`/paper/${paper.id}`}
                className="results-paper-card"
              >
                <div className="results-paper-card__thumb">
                  <PaperThumbnailPlaceholder label={paper.title} />
                </div>
                <div className="results-paper-card__body">
                  <h3 className="results-paper-card__title">{paper.title}</h3>
                  <p className="results-paper-card__meta">
                    {paper.authors}
                    <span className="results-paper-card__meta-sep"> · </span>
                    {paper.year}
                    <span className="results-paper-card__meta-sep"> · </span>
                    {paper.journal}
                  </p>
                  <div className="results-paper-card__tags">
                    {paper.tags.slice(0, 5).map((tag, i) => (
                      <span
                        key={`${paper.id}-tag-${i}-${tag}`}
                        className="results-paper-chip"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
