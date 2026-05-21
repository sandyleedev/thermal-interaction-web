import { useMemo, useState } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import BodyMap from "./full-body/BodyMap";
import type { BodyMapVariant } from "./bodyMapVariant";
import { HeadBodyMapDetail } from "./head/HeadBodyMapDetail";
import { NeckBodyMapDetail } from "./neck/NeckBodyMapDetail";
import { paperTouchesBodyMapParent } from "@/lib/research/researchPapers";

export function BodyMapPanel() {
  const [variant, setVariant] = useState<BodyMapVariant>("countHeatmap");
  const {
    bodyMapPaperPool,
    bodyMapRegionCounts,
    globalPaperCountsByBodyRegion,
    selectedBodyRegion,
    selectedBodyFineSubregion,
    setBodyMapSelection,
    setBodyMapFineSubregion,
    clearBodyMapSelection,
  } = useResearchFilter();

  const headDetailPapers = useMemo(
    () =>
      bodyMapPaperPool.filter((p) => paperTouchesBodyMapParent(p, "head")),
    [bodyMapPaperPool],
  );

  const neckDetailPapers = useMemo(
    () =>
      bodyMapPaperPool.filter((p) => paperTouchesBodyMapParent(p, "neck")),
    [bodyMapPaperPool],
  );

  const showHeadDetail = selectedBodyRegion === "head";
  const showNeckDetail = selectedBodyRegion === "neck";

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
        {showHeadDetail ? (
          <HeadBodyMapDetail
            variant={variant}
            papers={headDetailPapers}
            selectedFineSubregion={selectedBodyFineSubregion}
            onSelectFine={setBodyMapFineSubregion}
            onBack={clearBodyMapSelection}
          />
        ) : showNeckDetail ? (
          <NeckBodyMapDetail
            variant={variant}
            papers={neckDetailPapers}
            selectedFineSubregion={selectedBodyFineSubregion}
            onSelectFine={setBodyMapFineSubregion}
            onBack={clearBodyMapSelection}
          />
        ) : (
          <BodyMap
            variant={variant}
            paperCountsByPart={bodyMapRegionCounts}
            heatmapDotPapers={bodyMapPaperPool}
            heatmapScaleReferenceCounts={globalPaperCountsByBodyRegion}
            selectedBodyRegion={selectedBodyRegion}
            onSelectBodyRegion={setBodyMapSelection}
          />
        )}
      </div>
    </aside>
  );
}
