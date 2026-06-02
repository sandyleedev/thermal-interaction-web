import { useCallback, useMemo, useState } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { BODY_MAP_DETAIL_REGIONS } from "@/lib/research/bodyMapChipLabels";
import type { BodyMapParentRegion } from "@/lib/research/bodyMapRegions";
import BodyMap from "@/components/body-map/full-body/BodyMap";
import { BodyMapDetailSelectAll } from "@/components/body-map/BodyMapDetailSelectAll";
import { BodyMapDetailBackButton } from "@/components/body-map/shared/BodyMapDetailBackButton";
import { BodyMapSelectionChips } from "@/components/body-map/BodyMapSelectionChips";
import type { BodyMapVariant } from "@/components/body-map/bodyMapVariant";
import { HeadBodyMapDetail } from "@/components/body-map/head/HeadBodyMapDetail";
import { NeckBodyMapDetail } from "@/components/body-map/neck/NeckBodyMapDetail";
import { ArmBodyMapDetail } from "@/components/body-map/arm/ArmBodyMapDetail";
import { HandBodyMapDetail } from "@/components/body-map/hand/HandBodyMapDetail";
import { FootBodyMapDetail } from "@/components/body-map/foot/FootBodyMapDetail";
import { LegBodyMapDetail } from "@/components/body-map/leg/LegBodyMapDetail";
import { TorsoBodyMapDetail } from "@/components/body-map/torso/TorsoBodyMapDetail";
import { paperTouchesBodyMapParent } from "@/lib/research/researchPapers";

export function BodyMapPanel() {
  const [variant, setVariant] = useState<BodyMapVariant>("countHeatmap");
  const {
    bodyMapPaperPool,
    bodyMapRegionCounts,
    globalPaperCountsByBodyRegion,
    selectedBodyMapChips,
    activeDetailRegion,
    toggleBodyMapChip,
    removeBodyMapChip,
    clearBodyMapChips,
    navigateToBodyMapDetail,
    exitBodyMapDetail,
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

  const torsoDetailPapers = useMemo(
    () =>
      bodyMapPaperPool.filter((p) => paperTouchesBodyMapParent(p, "torso")),
    [bodyMapPaperPool],
  );

  const armDetailPapers = useMemo(
    () =>
      bodyMapPaperPool.filter((p) => paperTouchesBodyMapParent(p, "arm")),
    [bodyMapPaperPool],
  );

  const handDetailPapers = useMemo(
    () =>
      bodyMapPaperPool.filter((p) => paperTouchesBodyMapParent(p, "hand")),
    [bodyMapPaperPool],
  );

  const footDetailPapers = useMemo(
    () =>
      bodyMapPaperPool.filter((p) => paperTouchesBodyMapParent(p, "foot")),
    [bodyMapPaperPool],
  );

  const legDetailPapers = useMemo(
    () =>
      bodyMapPaperPool.filter((p) => paperTouchesBodyMapParent(p, "leg")),
    [bodyMapPaperPool],
  );

  const showHeadDetail = activeDetailRegion === "head";
  const showNeckDetail = activeDetailRegion === "neck";
  const showTorsoDetail = activeDetailRegion === "torso";
  const showArmDetail = activeDetailRegion === "arm";
  const showHandDetail = activeDetailRegion === "hand";
  const showFootDetail = activeDetailRegion === "foot";
  const showLegDetail = activeDetailRegion === "leg";

  const handleFullBodyPartClick = useCallback(
    (region: BodyMapParentRegion) => {
      if (BODY_MAP_DETAIL_REGIONS.has(region)) {
        navigateToBodyMapDetail(region);
        return;
      }
      if (region === "wholeBody") {
        toggleBodyMapChip("wholeBody", "general");
        return;
      }
      toggleBodyMapChip(region);
    },
    [navigateToBodyMapDetail, toggleBodyMapChip],
  );

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
        <div className="body-map-panel-stage">
          {selectedBodyMapChips.length > 0 ? (
            <div className="body-map-selection-block">
              <div className="body-map-selection-actions">
                <button
                  type="button"
                  className="other-filters-clear-all"
                  onClick={clearBodyMapChips}
                >
                  Clear
                </button>
              </div>
              <BodyMapSelectionChips
                chips={selectedBodyMapChips}
                onRemoveChip={(chip) =>
                  removeBodyMapChip(chip.parent, chip.subpart, chip.side)
                }
              />
            </div>
          ) : null}
          {activeDetailRegion ? (
            <div
              className={
                selectedBodyMapChips.length > 0
                  ? "body-map-detail-controls body-map-detail-controls--with-chips"
                  : "body-map-detail-controls body-map-detail-controls--no-chips"
              }
            >
              <BodyMapDetailBackButton onBack={exitBodyMapDetail} />
              <BodyMapDetailSelectAll parent={activeDetailRegion} />
            </div>
          ) : null}
          {showHeadDetail ? (
            <HeadBodyMapDetail
              variant={variant}
              papers={headDetailPapers}
            />
          ) : showNeckDetail ? (
            <NeckBodyMapDetail
              variant={variant}
              papers={neckDetailPapers}
            />
          ) : showTorsoDetail ? (
            <TorsoBodyMapDetail
              variant={variant}
              papers={torsoDetailPapers}
            />
          ) : showArmDetail ? (
            <ArmBodyMapDetail
              variant={variant}
              papers={armDetailPapers}
            />
          ) : showHandDetail ? (
            <HandBodyMapDetail
              variant={variant}
              papers={handDetailPapers}
            />
          ) : showFootDetail ? (
            <FootBodyMapDetail
              variant={variant}
              papers={footDetailPapers}
            />
          ) : showLegDetail ? (
            <LegBodyMapDetail
              variant={variant}
              papers={legDetailPapers}
            />
          ) : (
            <BodyMap
              variant={variant}
              paperCountsByPart={bodyMapRegionCounts}
              heatmapDotPapers={bodyMapPaperPool}
              heatmapScaleReferenceCounts={globalPaperCountsByBodyRegion}
              selectedBodyMapChips={selectedBodyMapChips}
              onPartClick={handleFullBodyPartClick}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
