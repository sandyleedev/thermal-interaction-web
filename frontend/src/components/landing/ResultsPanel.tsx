import { useResearchFilter } from "@/context/ResearchFilterContext";

export function ResultsPanel() {
  const { filteredPaperCount, totalPaperCount } = useResearchFilter();

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
      </div>
    </section>
  );
}
