import { useResearchFilter } from "@/context/ResearchFilterContext";
import { getSelectableSubpartIds } from "@/lib/research/bodyMapChipSelection";
import type { BodyMapParentRegion } from "@/lib/research/bodyMapRegions";

type BodyMapDetailSelectAllProps = {
  parent: BodyMapParentRegion;
};

export function BodyMapDetailSelectAll({ parent }: BodyMapDetailSelectAllProps) {
  const {
    areAllBodyMapSubpartsSelected,
    selectAllBodyMapSubparts,
    clearBodyMapSubpartsForParent,
  } = useResearchFilter();

  const subpartIds = getSelectableSubpartIds(parent);
  if (subpartIds.length === 0) return null;

  const allSelected = areAllBodyMapSubpartsSelected(parent);

  return (
    <label className="body-map-detail-select-all">
      <input
        type="checkbox"
        checked={allSelected}
        onChange={() => {
          if (allSelected) clearBodyMapSubpartsForParent(parent);
          else selectAllBodyMapSubparts(parent);
        }}
      />
      <span>Select All</span>
    </label>
  );
}
