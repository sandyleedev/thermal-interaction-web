/**
 * Body-map taxonomy helpers: resolve raw `bodySites`, placement rules, counts, filters.
 */

import type {
  BodyMapDetailParentId,
  BodyMapDetailRegion,
  BodyMapPlacementRegion,
} from "@/lib/research/bodyMapRegions";

import {
  BODY_MAP_PHYSICAL_L1_IDS,
  BODY_MAP_REGION_IDS,
} from "@/lib/research/bodyMapRegions";

export type {
  BodyMapDetailParentId,
  BodyMapDetailRegion,
  BodyMapPlacementRegion,
  BodyMapRegion,
} from "@/lib/research/bodyMapRegions";

export {
  BODY_MAP_COARSE_REGION_IDS,
  BODY_MAP_L2_SUBREGIONS_BY_PARENT,
  BODY_MAP_PHYSICAL_L1_IDS,
  BODY_MAP_REGION_IDS,
} from "@/lib/research/bodyMapRegions";

// ---------------------------------------------------------------------------
// Resolve raw bodySites → BodyMapDetailRegion
// ---------------------------------------------------------------------------

function isBodyMapDetailParentId(s: string): s is BodyMapDetailParentId {
  return (
    s === "wholeBody" ||
    s === "head" ||
    s === "neck" ||
    s === "torso" ||
    s === "arm" ||
    s === "wrist" ||
    s === "hand" ||
    s === "leg" ||
    s === "ankle" ||
    s === "foot"
  );
}

/**
 * Old or “dot placement only” region strings in `bodySites.region` map onto an L1 parent.
 * Prefer storing the parent in `region` and the fine slug in `subregion` in JSON.
 */
const LEGACY_REGION_TO_L1_PARENT: Readonly<
  Record<string, BodyMapDetailParentId>
> = {
  ear: "head",
  forehead: "head",
  nose: "head",
  cheek: "head",
  lip: "head",
  tongue: "head",
  mouth: "head",
  "upper-arm": "arm",
  forearm: "arm",
  thigh: "leg",
  crural: "leg",
  "crural-region": "leg",
  "leg-thigh": "leg",
  "leg-crural": "leg",
};

/**
 * Turn one raw site into a single canonical `BodyMapDetailRegion`.
 * - If `region` is already an L1 id, keep it.
 * - If it is a legacy fine name, attach under the mapped parent and fix `subregion` when needed.
 */
export function resolveBodySite(site: {
  region: string;
  subregion: string;
  side?: string;
}): BodyMapDetailRegion {
  const rawRegion = site.region.trim();
  const rawSub = (site.subregion ?? "").trim();

  if (isBodyMapDetailParentId(rawRegion)) {
    return {
      parent: rawRegion,
      subregion: rawSub || "general",
    };
  }

  const mappedParent = LEGACY_REGION_TO_L1_PARENT[rawRegion.toLowerCase()];
  if (mappedParent) {
    return {
      parent: mappedParent,
      subregion: rawSub || rawRegion,
    };
  }

  // Unknown `region` string — keep data visible under torso so nothing silently disappears.
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
 * Whole-body **general** does not place dots (see global silhouette fill in `BodyMap`);
 * counts still roll up via `detailParentKeysForAggregatedCounts`.
 */
export function bodyMapPlacementRegionsForDetail(
  site: BodyMapDetailRegion,
): BodyMapPlacementRegion[] {
  if (site.parent === "wholeBody") {
    if (isResolvedWholeBodyGeneral(site)) return [];
    return [...BODY_MAP_REGION_IDS];
  }
  return [site.parent as BodyMapPlacementRegion];
}

/** Key in aggregated `paperCountsByBodyRegion` maps: papers with a whole-body **general** site. */
export const WHOLE_BODY_GENERAL_COUNT_KEY = "wholeBodyGeneral" as const;

// ---------------------------------------------------------------------------
// Counting + filter match
// ---------------------------------------------------------------------------

/**
 * Which `BodyMapDetailParentId` count keys one site increments for aggregate maps.
 * Whole-body studies add +1 to every physical L1 bucket so every tile lights up.
 */
export function detailParentKeysForAggregatedCounts(
  site: BodyMapDetailRegion,
): readonly BodyMapDetailParentId[] {
  if (site.parent === "wholeBody") return BODY_MAP_PHYSICAL_L1_IDS;
  return [site.parent];
}

/** Minimal paper shape so this module stays free of circular imports with `researchPapers.ts`. */
export type BodySitesCarrier = {
  bodySites?: readonly { region: string; subregion: string; side?: string }[];
};

/** @see detailParentKeysForAggregatedCounts */
export function bodyMapDetailKeysForPaper(
  paper: BodySitesCarrier,
): BodyMapDetailParentId[] {
  const sites = paper.bodySites ?? [];
  const bag = new Set<BodyMapDetailParentId>();
  for (const s of sites) {
    const resolved = resolveBodySite(s);
    for (const k of detailParentKeysForAggregatedCounts(resolved)) bag.add(k);
  }
  return Array.from(bag);
}

/**
 * True if the paper should stay visible when the user picks one L1 region on the map.
 * Whole-body sites match every L1 filter except “foot only” style logic — here, whole-body matches all.
 */
export function paperTouchesBodyMapDetailParent(
  paper: BodySitesCarrier,
  detailParent: BodyMapDetailParentId,
): boolean {
  const sites = paper.bodySites ?? [];
  if (detailParent === "wholeBody") {
    for (const s of sites) {
      if (resolveBodySite(s).parent === "wholeBody") return true;
    }
    return false;
  }
  for (const s of sites) {
    const { parent } = resolveBodySite(s);
    if (parent === "wholeBody") return true;
    if (parent === detailParent) return true;
  }
  return false;
}

/**
 * Level-2 filter (optional). When `fineSubregion` is set, `detailParent` must also be set.
 * Match is case-insensitive on `subregion` after trimming.
 */
export function paperMatchesBodyMapFineSelection(
  paper: BodySitesCarrier,
  detailParent: BodyMapDetailParentId,
  fineSubregion: string,
): boolean {
  const needle = fineSubregion.trim().toLowerCase();
  if (!needle) return paperTouchesBodyMapDetailParent(paper, detailParent);

  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent !== detailParent) continue;
    if (resolved.subregion.trim().toLowerCase() === needle) return true;
  }
  return false;
}
