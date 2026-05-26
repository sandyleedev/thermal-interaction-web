/**
 * Body map region utilities.
 *
 * Maps `bodySites` detail regions to placement regions, and provides
 * helpers for region counts and body-map filter matching.
 *
 * To check the region types and subregion tables, refer to `bodyMapRegions.ts`.
 */

import {
  BODY_MAP_PARENT_REGIONS,
  type BodyMapDetailRegion,
  type BodyMapParentRegion,
  type BodyMapPlacementRegion,
} from "@/lib/research/bodyMapRegions";

export type {
  BodyMapDetailRegion,
  BodyMapParentRegion,
  BodyMapPlacementRegion,
  BodyMapRegion,
} from "@/lib/research/bodyMapRegions";

export {
  BODY_MAP_L2_SUBREGIONS_BY_PARENT,
  BODY_MAP_PARENT_REGIONS,
  BODY_MAP_PLACEMENT_REGIONS,
  BODY_MAP_REGIONS,
  bodyMapRegionForPlacement,
} from "@/lib/research/bodyMapRegions";

const BODY_MAP_PARENT_REGION_SET = new Set<string>(BODY_MAP_PARENT_REGIONS);

// ---------------------------------------------------------------------------
// Resolve raw bodySites → BodyMapDetailRegion
// ---------------------------------------------------------------------------

function isBodyMapParentRegion(s: string): s is BodyMapParentRegion {
  return BODY_MAP_PARENT_REGION_SET.has(s);
}

/**
 * Turn one raw site into a single canonical `BodyMapDetailRegion`.
 * - If `region` is already an L1 parent name, keep it.
 * - If it is a legacy fine name, attach under the mapped parent and fix `subregion` when needed.
 */
export function resolveBodySite(site: {
  region: string;
  subregion: string;
  side?: string;
}): BodyMapDetailRegion {
  const rawRegion = site.region.trim();
  const rawSub = (site.subregion ?? "").trim();

  if (isBodyMapParentRegion(rawRegion)) {
    return {
      parent: rawRegion,
      subregion: rawSub || "general",
    };
  }

  // if we have an unknown region, warn and fallback to the torso general
  console.warn(`Unknown body map region: ${rawRegion}`);
  return {
    parent: "torso",
    subregion: rawSub || "general",
  };
}

// ---------------------------------------------------------------------------
// Heatmap dot placement on the *current* L1 SVG (paths exist only for silhouette parts)
// ---------------------------------------------------------------------------

/** True when the site is the product “Whole body → General” row (no per-region dots). */
export function isResolvedWholeBodyGeneral(site: BodyMapDetailRegion): boolean {
  return (
    site.parent === "wholeBody" &&
    site.subregion.trim().toLowerCase() === "general"
  );
}

export function paperHasWholeBodyGeneralSite(paper: BodySitesCarrier): boolean {
  for (const s of paper.bodySites ?? []) {
    if (isResolvedWholeBodyGeneral(resolveBodySite(s))) return true;
  }
  return false;
}

export function countPapersWithWholeBodyGeneral(
  papers: readonly BodySitesCarrier[],
): number {
  let n = 0;
  for (const p of papers) {
    if (paperHasWholeBodyGeneralSite(p)) n += 1;
  }
  return n;
}

/**
 * Which `BodyMapPlacementRegion`s receive a dot for this detail site on the L1 map.
 * Whole-body sites do not place per-region dots (outline + tint / ring handle whole-body UX).
 * Arm, leg, and torso map L2 subregions to distinct placement keys; other parents mirror {@link BodyMapRegion}.
 */
export function bodyMapPlacementRegionsForDetail(
  site: BodyMapDetailRegion,
): BodyMapPlacementRegion[] {
  if (site.parent === "wholeBody") return [];

  if (site.parent === "arm") {
    const sub = site.subregion.trim().toLowerCase();
    if (sub === "forearm") return ["arm-forearm"];
    if (sub === "upper-arm" || sub === "upper arm") return ["arm-upper-arm"];
    return ["arm-general"];
  }

  if (site.parent === "leg") {
    const sub = site.subregion.trim().toLowerCase();
    if (sub === "thigh") return ["leg-thigh"];
    if (sub === "crural" || sub === "crural-region") return ["leg-crural"];
    return ["leg-general"];
  }

  if (site.parent === "torso") {
    const sub = site.subregion.trim().toLowerCase();
    if (sub === "shoulder") return ["torso-shoulder"];
    if (sub === "chest") return ["torso-chest"];
    if (sub === "abdomen") return ["torso-abdomen"];
    // general, back, and any other L2 → full merged torso paths (same cohort as former "torso general").
    return ["torso-general"];
  }

  return [site.parent as BodyMapPlacementRegion];
}

/** Key in aggregated `paperCountsByBodyRegion` maps: papers with a whole-body **general** site. */
export const WHOLE_BODY_GENERAL_COUNT_KEY = "wholeBodyGeneral" as const;

// ---------------------------------------------------------------------------
// Counting + filter match
// ---------------------------------------------------------------------------

/**
 * Which `BodyMapParentRegion` count keys one site increments for aggregate maps.
 * Whole-body sites contribute only `wholeBody` here (not +1 on every physical region).
 */
export function parentKeysForBodyMapAggregatedCounts(
  site: BodyMapDetailRegion,
): readonly BodyMapParentRegion[] {
  if (site.parent === "wholeBody") return ["wholeBody"];
  return [site.parent];
}

/** @see parentKeysForBodyMapAggregatedCounts */
export function bodyMapParentKeysForPaper(
  paper: BodySitesCarrier,
): BodyMapParentRegion[] {
  const sites = paper.bodySites ?? [];
  const bag = new Set<BodyMapParentRegion>();
  for (const s of sites) {
    const resolved = resolveBodySite(s);
    for (const k of parentKeysForBodyMapAggregatedCounts(resolved)) bag.add(k);
  }
  return Array.from(bag);
}

/** Minimal paper shape so this module stays free of circular imports with `researchPapers.ts`. */
export type BodySitesCarrier = {
  bodySites?: readonly { region: string; subregion: string; side?: string }[];
};

/**
 * True if the paper should stay visible when the user picks one L1 region on the map.
 * Whole-body outline selection (`wholeBody`) matches sites whose resolved parent is `wholeBody`.
 * Physical regions (head, arm, …) match only sites that resolve to that same parent — a
 * whole-body-only site does not satisfy those filters.
 */
export function paperTouchesBodyMapParent(
  paper: BodySitesCarrier,
  parent: BodyMapParentRegion,
): boolean {
  const sites = paper.bodySites ?? [];
  for (const s of sites) {
    if (resolveBodySite(s).parent === parent) return true;
  }
  return false;
}

/** Head zoom map hit ids (general ring uses `general`). */
export const HEAD_DETAIL_HIT_IDS = [
  "general",
  "forehead",
  "nose",
  "lip",
  "tongue",
  "left-ear",
  "right-ear",
  "left-cheek",
  "right-cheek",
] as const;

export type HeadDetailHitId = (typeof HEAD_DETAIL_HIT_IDS)[number];

const HEAD_DETAIL_HIT_ID_SET = new Set<string>(HEAD_DETAIL_HIT_IDS);

/** Neck zoom map hit ids (general ring uses `general`). */
export const NECK_DETAIL_HIT_IDS = ["anterior", "posterior"] as const;

export type NeckDetailHitId = (typeof NECK_DETAIL_HIT_IDS)[number];

const NECK_DETAIL_HIT_ID_SET = new Set<string>([
  ...NECK_DETAIL_HIT_IDS,
  "general",
]);

/** Torso zoom map hit ids (general ring uses `general`). */
export const TORSO_DETAIL_HIT_IDS = [
  "chest",
  "abdomen",
  "shoulder",
  "back",
] as const;

export type TorsoDetailHitId = (typeof TORSO_DETAIL_HIT_IDS)[number];

const TORSO_DETAIL_HIT_ID_SET = new Set<string>([
  ...TORSO_DETAIL_HIT_IDS,
  "general",
]);

/** Arm zoom map hit ids (general ring uses `general`). */
export const ARM_DETAIL_HIT_IDS = ["upper-arm", "forearm"] as const;

export type ArmDetailHitId = (typeof ARM_DETAIL_HIT_IDS)[number];

export type ArmDetailSide = "left" | "right";

const ARM_DETAIL_HIT_ID_SET = new Set<string>([
  ...ARM_DETAIL_HIT_IDS,
  "general",
]);

/** True when a body site’s optional `side` should appear on the given arm panel. */
export function armSiteMatchesPanelSide(
  site: { side?: string },
  panelSide: ArmDetailSide,
): boolean {
  const sd = (site.side ?? "").trim().toLowerCase();
  if (sd === panelSide) return true;
  if (sd === "" || sd === "unspecified") return true;
  return false;
}

function headEarOrCheekHit(
  paper: BodySitesCarrier,
  sub: "ear" | "cheek",
  lateral: "left" | "right",
): boolean {
  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "head" || resolved.subregion.trim().toLowerCase() !== sub) {
      continue;
    }
    const sd = (s.side ?? "").trim().toLowerCase();
    if (sd === lateral) return true;
    if (sd === "" || sd === "unspecified") return true;
  }
  return false;
}

function headExactSub(paper: BodySitesCarrier, sub: string): boolean {
  const sl = sub.toLowerCase();
  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent === "head" && resolved.subregion.trim().toLowerCase() === sl) {
      return true;
    }
  }
  return false;
}

/**
 * Head L2 zoom: `general` matches only `head → general` sites; lateral hits include unspecified side.
 */
export function paperMatchesHeadFineSelection(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return headExactSub(paper, "general");
    case "forehead":
      return headExactSub(paper, "forehead");
    case "nose":
      return headExactSub(paper, "nose");
    case "lip":
      return headExactSub(paper, "lip");
    case "tongue":
      return headExactSub(paper, "tongue");
    case "left-ear":
      return headEarOrCheekHit(paper, "ear", "left");
    case "right-ear":
      return headEarOrCheekHit(paper, "ear", "right");
    case "left-cheek":
      return headEarOrCheekHit(paper, "cheek", "left");
    case "right-cheek":
      return headEarOrCheekHit(paper, "cheek", "right");
    default:
      return false;
  }
}

function neckExactSub(paper: BodySitesCarrier, sub: string): boolean {
  const sl = sub.toLowerCase();
  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent === "neck" && resolved.subregion.trim().toLowerCase() === sl) {
      return true;
    }
  }
  return false;
}

/**
 * Neck L2 zoom: `general` matches only `neck → general` sites.
 */
export function paperMatchesNeckFineSelection(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return neckExactSub(paper, "general");
    case "anterior":
      return neckExactSub(paper, "anterior");
    case "posterior":
      return neckExactSub(paper, "posterior");
    default:
      return false;
  }
}

function torsoExactSub(paper: BodySitesCarrier, sub: string): boolean {
  const sl = sub.toLowerCase();
  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent === "torso" && resolved.subregion.trim().toLowerCase() === sl) {
      return true;
    }
  }
  return false;
}

/**
 * Torso L2 zoom: `general` matches only `torso → general` sites.
 */
export function paperMatchesTorsoFineSelection(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return torsoExactSub(paper, "general");
    case "chest":
      return torsoExactSub(paper, "chest");
    case "abdomen":
      return torsoExactSub(paper, "abdomen");
    case "shoulder":
      return torsoExactSub(paper, "shoulder");
    case "back":
      return torsoExactSub(paper, "back");
    default:
      return false;
  }
}

function armExactSubForSide(
  paper: BodySitesCarrier,
  sub: string,
  panelSide: ArmDetailSide,
): boolean {
  const sl = sub.toLowerCase();
  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "arm") continue;
    if (resolved.subregion.trim().toLowerCase() !== sl) continue;
    if (!armSiteMatchesPanelSide(s, panelSide)) continue;
    return true;
  }
  return false;
}

/**
 * Arm L2 zoom on one panel: `general` matches only `arm → general` sites for that side.
 */
export function paperMatchesArmFineSelectionForSide(
  paper: BodySitesCarrier,
  hit: string,
  panelSide: ArmDetailSide,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return armExactSubForSide(paper, "general", panelSide);
    case "upper-arm":
      return (
        armExactSubForSide(paper, "upper-arm", panelSide) ||
        armExactSubForSide(paper, "upper arm", panelSide)
      );
    case "forearm":
      return armExactSubForSide(paper, "forearm", panelSide);
    default:
      return false;
  }
}

/** Arm L2 zoom (any side): used for filter chips and aggregate counts. */
export function paperMatchesArmFineSelection(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  return (
    paperMatchesArmFineSelectionForSide(paper, hit, "left") ||
    paperMatchesArmFineSelectionForSide(paper, hit, "right")
  );
}

/**
 * Level-2 filter (optional). When `fineSubregion` is set, `parent` must also be set.
 * Match is case-insensitive on `subregion` after trimming.
 */
export function paperMatchesBodyMapFineSelection(
  paper: BodySitesCarrier,
  parent: BodyMapParentRegion,
  fineSubregion: string,
): boolean {
  const needle = fineSubregion.trim().toLowerCase();
  if (!needle) return paperTouchesBodyMapParent(paper, parent);

  if (parent === "head" && HEAD_DETAIL_HIT_ID_SET.has(needle)) {
    return paperMatchesHeadFineSelection(paper, needle);
  }

  if (parent === "neck" && NECK_DETAIL_HIT_ID_SET.has(needle)) {
    return paperMatchesNeckFineSelection(paper, needle);
  }

  if (parent === "torso" && TORSO_DETAIL_HIT_ID_SET.has(needle)) {
    return paperMatchesTorsoFineSelection(paper, needle);
  }

  if (parent === "arm" && ARM_DETAIL_HIT_ID_SET.has(needle)) {
    return paperMatchesArmFineSelection(paper, needle);
  }

  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent !== parent) continue;
    if (resolved.subregion.trim().toLowerCase() === needle) return true;
  }
  return false;
}
