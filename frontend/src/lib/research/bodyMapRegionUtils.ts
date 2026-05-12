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
  BODY_MAP_REGIONS,
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
 */
export function bodyMapPlacementRegionsForDetail(
  site: BodyMapDetailRegion,
): BodyMapPlacementRegion[] {
  if (site.parent === "wholeBody") return [];
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
 * Whole-body sites match every L1 filter except “foot only” style logic — here, whole-body matches all.
 */
export function paperTouchesBodyMapParent(
  paper: BodySitesCarrier,
  parent: BodyMapParentRegion,
): boolean {
  const sites = paper.bodySites ?? [];
  if (parent === "wholeBody") {
    for (const s of sites) {
      if (resolveBodySite(s).parent === "wholeBody") return true;
    }
    return false;
  }
  for (const s of sites) {
    const { parent: p } = resolveBodySite(s);
    if (p === "wholeBody") return true;
    if (p === parent) return true;
  }
  return false;
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

  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent !== parent) continue;
    if (resolved.subregion.trim().toLowerCase() === needle) return true;
  }
  return false;
}
