import { useCallback } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  BODY_MAP_CHIP_ORDER,
  BODY_MAP_DETAIL_REGIONS,
  bodyMapParentRegionLabel,
} from "@/lib/research/bodyMapChipLabels";
import {
  bodyMapParentHasChipSelection,
  type BodyMapChipSelection,
} from "@/lib/research/bodyMapChipSelection";
import type { BodyMapParentRegion } from "@/lib/research/bodyMapRegions";
import type { BodySiteSide } from "@/lib/research/bodyMapSiteSide";

type BodyMapMobileRegionListProps = {
  onRegionPress: (region: BodyMapParentRegion) => void;
};

function isRegionSelected(
  region: BodyMapParentRegion,
  selectedChips: readonly BodyMapChipSelection[],
  activeDetailRegion: BodyMapParentRegion | null,
  isBodyMapChipSelected: (
    parent: BodyMapParentRegion,
    subpart?: string | null,
    side?: Extract<BodySiteSide, "left" | "right">,
  ) => boolean,
): boolean {
  if (region === "whole-body") {
    return isBodyMapChipSelected("whole-body", "general");
  }
  if (BODY_MAP_DETAIL_REGIONS.has(region)) {
    return (
      activeDetailRegion === region ||
      bodyMapParentHasChipSelection(selectedChips, region)
    );
  }
  return bodyMapParentHasChipSelection(selectedChips, region);
}

export function BodyMapMobileRegionList({
  onRegionPress,
}: BodyMapMobileRegionListProps) {
  const {
    selectedBodyMapChips,
    activeDetailRegion,
    isBodyMapChipSelected,
  } = useResearchFilter();

  const handlePress = useCallback(
    (region: BodyMapParentRegion) => {
      onRegionPress(region);
    },
    [onRegionPress],
  );

  return (
    <div
      className="body-map-mobile-region-list"
      role="group"
      aria-label="Select body region"
    >
      {BODY_MAP_CHIP_ORDER.map((region) => {
        const label = bodyMapParentRegionLabel(region);
        const opensDetail = BODY_MAP_DETAIL_REGIONS.has(region);
        const selected = isRegionSelected(
          region,
          selectedBodyMapChips,
          activeDetailRegion,
          isBodyMapChipSelected,
        );
        const actionLabel = opensDetail
          ? `Open ${label} detail map`
          : region === "whole-body"
            ? `Toggle ${label} (whole body) filter`
            : `Toggle ${label} filter`;

        return (
          <button
            key={region}
            type="button"
            className={[
              "body-map-mobile-region-btn",
              "filter-chip",
              selected ? "filter-chip--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={selected}
            aria-label={actionLabel}
            onClick={() => handlePress(region)}
          >
            <span className="filter-chip-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
