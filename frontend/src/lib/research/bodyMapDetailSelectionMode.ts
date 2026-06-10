import type { BodyMapParentRegion } from "@/lib/research/bodyMapRegions";
import type { BodySiteSide } from "@/type/bodySiteSide";
import type { BodyMapChipSelection } from "@/lib/research/bodyMapChipSelection";

/** Detail selection modes.
 * - "sided": Each side is a separate selection/hover.
 * - "merged": All sides are grouped together as a single selection/hover.
 */
export type BodyMapDetailSelectionMode = "sided" | "merged";

/** Toggle this to switch between sided and merged detail selection modes. */
export const BODY_MAP_DETAIL_SELECTION_MODE: BodyMapDetailSelectionMode =
  "merged";

/** Group together detail selections for merged detail selection mode. */
export function canonicalizeDetailSelection(
  parent: BodyMapParentRegion,
  subpart?: string | null,
  side?: Extract<BodySiteSide, "left" | "right">,
  mode: BodyMapDetailSelectionMode = BODY_MAP_DETAIL_SELECTION_MODE,
): BodyMapChipSelection {
  const normalizedSubpart = subpart?.trim().toLowerCase();
  if (mode === "sided") {
    return { parent, subpart: normalizedSubpart, side };
  }

  let mergedSubpart = normalizedSubpart;
  if (parent === "head") {
    if (normalizedSubpart === "left-ear" || normalizedSubpart === "right-ear") {
      mergedSubpart = "ear";
    } else if (
      normalizedSubpart === "left-cheek" ||
      normalizedSubpart === "right-cheek"
    ) {
      mergedSubpart = "cheek";
    }
  } else if (parent === "leg") {
    if (
      normalizedSubpart === "left-thigh" ||
      normalizedSubpart === "right-thigh"
    ) {
      mergedSubpart = "thigh";
    } else if (
      normalizedSubpart === "left-crural-region" ||
      normalizedSubpart === "right-crural-region"
    ) {
      mergedSubpart = "crural-region";
    }
  } else if (parent === "torso") {
    if (
      normalizedSubpart === "left-shoulder" ||
      normalizedSubpart === "right-shoulder"
    ) {
      mergedSubpart = "shoulder";
    }
  }

  return { parent, subpart: mergedSubpart };
}

/** Group together hover hit ids for merged detail selection mode. */
export function mergedHoverPairHitIds(
  parent: BodyMapParentRegion,
  hitId: string,
): readonly string[] {
  const hit = hitId.trim().toLowerCase();
  if (parent === "head") {
    if (hit === "left-ear" || hit === "right-ear") {
      return ["left-ear", "right-ear"];
    }
    if (hit === "left-cheek" || hit === "right-cheek") {
      return ["left-cheek", "right-cheek"];
    }
  }
  if (parent === "leg") {
    if (hit === "left-thigh" || hit === "right-thigh") {
      return ["left-thigh", "right-thigh"];
    }
    if (hit === "left-crural-region" || hit === "right-crural-region") {
      return ["left-crural-region", "right-crural-region"];
    }
  }
  if (parent === "torso") {
    if (hit === "left-shoulder" || hit === "right-shoulder") {
      return ["left-shoulder", "right-shoulder"];
    }
  }
  return [hit];
}
