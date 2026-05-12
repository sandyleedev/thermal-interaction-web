import { useState } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import BodyMap, { type BodyMapVariant } from "./BodyMap";

export function BodyMapPanel() {
  const [variant, setVariant] = useState<BodyMapVariant>("countHeatmap");
  const {
    paperCountsByBodyRegion,
    globalPaperCountsByBodyRegion,
    filteredPapers,
    selectedBodyRegion,
    setBodyMapSelection,
  } = useResearchFilter();

  return (
    <aside className="landing-panel landing-body-map">
      <h2 className="panel-title">Body map</h2>
      <div
        className="body-map-toolbar"
        role="group"
        aria-label="Body map visualization mode"
      >
        <div className="body-map-mode-switch">
          <button
            type="button"
            className={
              variant === "countHeatmap" ? "is-active" : undefined
            }
            onClick={() => setVariant("countHeatmap")}
          >
            Dot view
          </button>
          <button
            type="button"
            className={variant === "rawDots" ? "is-active" : undefined}
            onClick={() => setVariant("rawDots")}
          >
            Area view
          </button>
        </div>
      </div>
      <div className="panel-content panel-content-center">
        <BodyMap
          variant={variant}
          paperCountsByPart={paperCountsByBodyRegion}
          heatmapDotPapers={filteredPapers}
          heatmapScaleReferenceCounts={globalPaperCountsByBodyRegion}
          selectedBodyRegion={selectedBodyRegion}
          onSelectBodyRegion={setBodyMapSelection}
        />
      </div>
    </aside>
  );
}
