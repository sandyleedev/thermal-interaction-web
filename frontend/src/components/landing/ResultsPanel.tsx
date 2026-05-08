import { useMemo } from "react";
import { Link } from "react-router-dom";
import { resolvePaperPreview } from "@/data/paperPreviews";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { PaperThumbnailPlaceholder } from "@/components/landing/PaperThumbnailPlaceholder";

function lastNameOf(author: string): string {
  const name = author.trim();
  if (!name) return "";
  if (name.includes(",")) {
    const [last] = name.split(",");
    return last.trim();
  }
  const parts = name.split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

function listAuthorsLabel(authors: string): string {
  const parsed = authors
    .split(";")
    .map((a) => a.trim())
    .filter(Boolean);
  if (parsed.length <= 2) {
    return parsed.map(lastNameOf).join(", ");
  }
  return `${lastNameOf(parsed[0])} et al.`;
}

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
                  <PaperThumbnailPlaceholder
                    label={paper.title}
                    imageUrls={paper.thumbnailUrls}
                  />
                </div>
                <div className="results-paper-card__body">
                  <h3 className="results-paper-card__title">{paper.title}</h3>
                  <p className="results-paper-card__meta">
                    {listAuthorsLabel(paper.authors)}
                    <span className="results-paper-card__meta-sep"> · </span>
                    {paper.publicationYear}
                    <span className="results-paper-card__meta-sep"> · </span>
                    {paper.publicationVenue}
                  </p>
                  <div className="results-paper-card__tags">
                    {paper.keywords.map((tag, i) => (
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
