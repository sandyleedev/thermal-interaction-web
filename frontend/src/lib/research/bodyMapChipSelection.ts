import {
  BODY_MAP_L2_SUBREGIONS_BY_PARENT,
  type BodyMapParentRegion,
} from "@/lib/research/bodyMapRegions";
import {
  HEAD_DETAIL_HIT_IDS,
  NECK_DETAIL_HIT_IDS,
  paperHasWholeBodyGeneralSite,
  paperMatchesBodyMapFineSelection,
  paperTouchesBodyMapParent,
  TORSO_DETAIL_HIT_IDS,
  type BodySitesCarrier,
} from "@/lib/research/bodyMapRegionUtils";

/** One body-map filter chip: L1 parent plus optional L2 subpart hit id. */
export type BodyMapChipSelection = {
  parent: BodyMapParentRegion;
  /** L2 slug (`left-cheek`, `general`, …). Omit for whole L1 (e.g. entire arm). */
  subpart?: string | null;
};

export function normalizeBodyMapSubpart(subpart?: string | null): string {
  return subpart?.trim().toLowerCase() ?? "";
}

export function bodyMapChipKey(selection: BodyMapChipSelection): string {
  const sub = normalizeBodyMapSubpart(selection.subpart);
  return sub ? `${selection.parent}:${sub}` : selection.parent;
}

export function bodyMapChipsEqual(
  a: BodyMapChipSelection,
  b: BodyMapChipSelection,
): boolean {
  return bodyMapChipKey(a) === bodyMapChipKey(b);
}

/** Subpart ids selectable in the detail map UI for this parent (includes `general`). */
export function getSelectableSubpartIds(
  parent: BodyMapParentRegion,
): readonly string[] {
  switch (parent) {
    case "head":
      return HEAD_DETAIL_HIT_IDS;
    case "neck":
      return ["general", ...NECK_DETAIL_HIT_IDS];
    case "torso":
      return ["general", ...TORSO_DETAIL_HIT_IDS];
    case "wholeBody":
      return ["general"];
    default:
      return BODY_MAP_L2_SUBREGIONS_BY_PARENT[parent];
  }
}

export function paperMatchesBodyMapChip(
  paper: BodySitesCarrier,
  chip: BodyMapChipSelection,
): boolean {
  if (chip.parent === "wholeBody") {
    const sub = normalizeBodyMapSubpart(chip.subpart);
    if (!sub || sub === "general") return paperHasWholeBodyGeneralSite(paper);
    return false;
  }
  const sub = normalizeBodyMapSubpart(chip.subpart);
  if (!sub) return paperTouchesBodyMapParent(paper, chip.parent);
  return paperMatchesBodyMapFineSelection(paper, chip.parent, sub);
}

export function bodyMapParentHasChipSelection(
  chips: readonly BodyMapChipSelection[],
  parent: BodyMapParentRegion,
): boolean {
  return chips.some((c) => c.parent === parent);
}
