import {
  BODY_MAP_L2_SUBREGIONS_BY_PARENT,
  type BodyMapParentRegion,
} from "@/lib/research/bodyMapRegions";
import type { BodySiteSide } from "@/lib/research/bodyMapSiteSide";
import {
  ARM_DETAIL_HIT_IDS,
  HAND_DETAIL_HIT_IDS,
  HEAD_DETAIL_HIT_IDS,
  LEG_DETAIL_HIT_IDS,
  NECK_DETAIL_HIT_IDS,
  paperHasWholeBodyGeneralSite,
  paperMatchesBodyMapFineSelection,
  paperTouchesBodyMapParent,
  TORSO_DETAIL_HIT_IDS,
  type BodySitesCarrier,
} from "@/lib/research/bodyMapRegionUtils";

/** L1 parents whose L2 detail map uses separate left/right panels (not encoded in hit id). */
const BILATERAL_PANEL_PARENTS = new Set<BodyMapParentRegion>([
  "arm",
  "hand",
  "foot",
]);

/** One body-map filter chip: L1 parent plus optional L2 subpart hit id and lateral side. */
export type BodyMapChipSelection = {
  parent: BodyMapParentRegion;
  /** L2 slug (`left-cheek`, `general`, …). Omit for whole L1 (e.g. entire arm). */
  subpart?: string | null;
  /** Set when the selection comes from a left/right detail panel (arm, hand, foot). */
  side?: Extract<BodySiteSide, "left" | "right">;
};

export function normalizeBodyMapSubpart(subpart?: string | null): string {
  return subpart?.trim().toLowerCase() ?? "";
}

export function bodyMapChipKey(selection: BodyMapChipSelection): string {
  const sub = normalizeBodyMapSubpart(selection.subpart);
  const side = selection.side?.trim().toLowerCase();
  if (sub && side) return `${selection.parent}:${sub}:${side}`;
  if (sub) return `${selection.parent}:${sub}`;
  return selection.parent;
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
    case "arm":
      return ["general", ...ARM_DETAIL_HIT_IDS];
    case "hand":
      return ["general", ...HAND_DETAIL_HIT_IDS];
    case "leg":
      return ["general", ...LEG_DETAIL_HIT_IDS];
    case "wholeBody":
      return ["general"];
    default:
      return BODY_MAP_L2_SUBREGIONS_BY_PARENT[parent];
  }
}

/** All chips used by Select All for a detail parent (includes L/R for panel-based maps). */
export function getSelectableChipsForParent(
  parent: BodyMapParentRegion,
): readonly BodyMapChipSelection[] {
  const subparts = getSelectableSubpartIds(parent);
  if (BILATERAL_PANEL_PARENTS.has(parent)) {
    const chips: BodyMapChipSelection[] = [];
    for (const subpart of subparts) {
      chips.push({ parent, subpart, side: "left" });
      chips.push({ parent, subpart, side: "right" });
    }
    return chips;
  }
  return subparts.map((subpart) => ({ parent, subpart }));
}

export function chipNeedsExplicitSide(parent: BodyMapParentRegion): boolean {
  return BILATERAL_PANEL_PARENTS.has(parent);
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
  return paperMatchesBodyMapFineSelection(
    paper,
    chip.parent,
    sub,
    chip.side,
  );
}

export function bodyMapParentHasChipSelection(
  chips: readonly BodyMapChipSelection[],
  parent: BodyMapParentRegion,
): boolean {
  return chips.some((c) => c.parent === parent);
}
