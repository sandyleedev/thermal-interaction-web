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
import {
  normalizeBodySiteSide,
  siteAssignsToPanelSideForDots,
  siteAssignsToPanelSideForAreaView,
  subregionMatches,
  type BodySiteSide,
} from "@/lib/research/bodyMapSiteSide";

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
  side?: string | null;
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

export function paperHasBodySubregion(
  paper: BodySitesCarrier,
  parent: BodyMapParentRegion,
  subregion: string,
): boolean {
  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent !== parent) continue;
    if (!subregionMatches(resolved.subregion, subregion)) continue;
    return true;
  }
  return false;
}

export function countPapersWithBodySubregion(
  papers: readonly BodySitesCarrier[],
  parent: BodyMapParentRegion,
  subregion: string,
): number {
  let n = 0;
  for (const p of papers) {
    if (paperHasBodySubregion(p, parent, subregion)) n += 1;
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
  id?: string;
  bodySites?: readonly { region: string; subregion: string; side?: string | null }[];
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

/** Hand zoom map hit ids (general ring uses `general`). Paint order: later = on top. */
export const HAND_INNER_DETAIL_HIT_IDS = [
  "palm",
  "fingers",
  "fingertips",
  "thenar-eminence",
] as const;

export const HAND_OUTER_DETAIL_HIT_IDS = ["hand-back"] as const;

export const HAND_DETAIL_HIT_IDS = [
  ...HAND_INNER_DETAIL_HIT_IDS,
  ...HAND_OUTER_DETAIL_HIT_IDS,
] as const;

export type HandDetailHitId = (typeof HAND_DETAIL_HIT_IDS)[number];

export type HandDetailSide = "left" | "right";

export type HandDetailSurface = "inner" | "outer";

export type HandDetailPanel = {
  side: HandDetailSide;
  surface: HandDetailSurface;
};

const HAND_DETAIL_HIT_ID_SET = new Set<string>([
  ...HAND_DETAIL_HIT_IDS,
  "general",
]);

const HAND_INNER_HIT_ID_SET = new Set<string>(HAND_INNER_DETAIL_HIT_IDS);

const HAND_OUTER_HIT_ID_SET = new Set<string>(HAND_OUTER_DETAIL_HIT_IDS);

/** True when a body site's optional `side` should appear on the given hand panel (filters / chips). */
export function handSiteMatchesPanelSide(
  site: { side?: string | null },
  panelSide: HandDetailSide,
): boolean {
  const sd = normalizeBodySiteSide(site.side);
  if (sd === panelSide) return true;
  if (sd === "unspecified") return true;
  return false;
}

function handExactSubForSideDots(
  paper: BodySitesCarrier,
  sub: string,
  panelSide: HandDetailSide,
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "hand") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (
      !siteAssignsToPanelSideForDots(
        s,
        panelSide,
        dotDistributionKey(paper, resolved, i),
      )
    ) {
      continue;
    }
    return true;
  }
  return false;
}

/** Hand L2 dot placement on one panel (unspecified sites distributed L/R). */
export function paperMatchesHandFineSelectionForPanelDots(
  paper: BodySitesCarrier,
  hit: string,
  panel: HandDetailPanel,
): boolean {
  const h = hit.trim().toLowerCase();
  if (!handHitMatchesPanelSurface(h, panel.surface)) return false;
  switch (h) {
    case "general":
      return handExactSubForSideDots(paper, "general", panel.side);
    case "palm":
      return handExactSubForSideDots(paper, "palm", panel.side);
    case "fingertips":
      return handExactSubForSideDots(paper, "fingertips", panel.side);
    case "fingers":
      return handExactSubForSideDots(paper, "fingers", panel.side);
    case "thenar-eminence":
      return handExactSubForSideDots(paper, "thenar-eminence", panel.side);
    case "hand-back":
      return handExactSubForSideDots(paper, "hand-back", panel.side);
    default:
      return false;
  }
}

function handExactSubForSideAreaView(
  paper: BodySitesCarrier,
  sub: string,
  panelSide: HandDetailSide,
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "hand") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (!siteAssignsToPanelSideForAreaView(s, panelSide)) continue;
    return true;
  }
  return false;
}

/** Hand L2 area view on one panel (unspecified sites on both sides). */
export function paperMatchesHandFineSelectionForPanelAreaView(
  paper: BodySitesCarrier,
  hit: string,
  panel: HandDetailPanel,
): boolean {
  const h = hit.trim().toLowerCase();
  if (!handHitMatchesPanelSurface(h, panel.surface)) return false;
  switch (h) {
    case "general":
      return handExactSubForSideAreaView(paper, "general", panel.side);
    case "palm":
      return handExactSubForSideAreaView(paper, "palm", panel.side);
    case "fingertips":
      return handExactSubForSideAreaView(paper, "fingertips", panel.side);
    case "fingers":
      return handExactSubForSideAreaView(paper, "fingers", panel.side);
    case "thenar-eminence":
      return handExactSubForSideAreaView(paper, "thenar-eminence", panel.side);
    case "hand-back":
      return handExactSubForSideAreaView(paper, "hand-back", panel.side);
    default:
      return false;
  }
}

function handHitMatchesPanelSurface(
  hit: string,
  surface: HandDetailSurface,
): boolean {
  const h = hit.trim().toLowerCase();
  if (h === "general") return true;
  if (surface === "inner") return HAND_INNER_HIT_ID_SET.has(h);
  return HAND_OUTER_HIT_ID_SET.has(h);
}

/**
 * Hand L2 zoom on one panel: `general` matches only `hand → general` sites for that side.
 * Inner panels count palm / fingertips / fingers / thenar-eminence; outer counts hand-back.
 */
export function paperMatchesHandFineSelectionForPanel(
  paper: BodySitesCarrier,
  hit: string,
  panel: HandDetailPanel,
): boolean {
  return paperMatchesHandFineSelectionForPanelDots(paper, hit, panel);
}

/** Hand L2 dot placement on one side (either surface panel). */
export function paperMatchesHandFineSelectionForSideDots(
  paper: BodySitesCarrier,
  hit: string,
  side: HandDetailSide,
): boolean {
  const panels: HandDetailPanel[] = [
    { side, surface: "inner" },
    { side, surface: "outer" },
  ];
  return panels.some((panel) =>
    paperMatchesHandFineSelectionForPanelDots(paper, hit, panel),
  );
}

/** Hand L2 area view on one side (unspecified duplicated on both sides). */
export function paperMatchesHandFineSelectionForSideAreaView(
  paper: BodySitesCarrier,
  hit: string,
  side: HandDetailSide,
): boolean {
  const panels: HandDetailPanel[] = [
    { side, surface: "inner" },
    { side, surface: "outer" },
  ];
  return panels.some((panel) =>
    paperMatchesHandFineSelectionForPanelAreaView(paper, hit, panel),
  );
}

/** Hand L2 zoom (any panel): used for aggregate counts and side-agnostic chips. */
export function paperMatchesHandFineSelection(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  const panels: HandDetailPanel[] = [
    { side: "left", surface: "inner" },
    { side: "right", surface: "inner" },
    { side: "left", surface: "outer" },
    { side: "right", surface: "outer" },
  ];
  return panels.some((panel) =>
    paperMatchesHandFineSelectionForPanel(paper, hit, panel),
  );
}

/** Foot zoom map hit ids (general ring uses `general`). Paint order: later = on top. */
export const FOOT_DETAIL_HIT_IDS = ["sole", "toes"] as const;

export type FootDetailHitId = (typeof FOOT_DETAIL_HIT_IDS)[number];

export type FootDetailSide = "left" | "right";

const FOOT_DETAIL_HIT_ID_SET = new Set<string>([
  ...FOOT_DETAIL_HIT_IDS,
  "general",
]);

/** True when a body site's optional `side` should appear on the given foot panel (filters / chips). */
export function footSiteMatchesPanelSide(
  site: { side?: string | null },
  panelSide: FootDetailSide,
): boolean {
  const sd = normalizeBodySiteSide(site.side);
  if (sd === panelSide) return true;
  if (sd === "unspecified") return true;
  return false;
}

function footExactSubForSideDots(
  paper: BodySitesCarrier,
  sub: string,
  panelSide: FootDetailSide,
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "foot") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (
      !siteAssignsToPanelSideForDots(
        s,
        panelSide,
        dotDistributionKey(paper, resolved, i),
      )
    ) {
      continue;
    }
    return true;
  }
  return false;
}

/** Foot L2 dot placement on one panel (unspecified sites distributed L/R). */
export function paperMatchesFootFineSelectionForSideDots(
  paper: BodySitesCarrier,
  hit: string,
  panelSide: FootDetailSide,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return footExactSubForSideDots(paper, "general", panelSide);
    case "sole":
      return footExactSubForSideDots(paper, "sole", panelSide);
    case "toes":
      return footExactSubForSideDots(paper, "toes", panelSide);
    default:
      return false;
  }
}

function footExactSubForSideAreaView(
  paper: BodySitesCarrier,
  sub: string,
  panelSide: FootDetailSide,
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "foot") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (!siteAssignsToPanelSideForAreaView(s, panelSide)) continue;
    return true;
  }
  return false;
}

/** Foot L2 area view on one panel (unspecified sites on both sides). */
export function paperMatchesFootFineSelectionForSideAreaView(
  paper: BodySitesCarrier,
  hit: string,
  panelSide: FootDetailSide,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return footExactSubForSideAreaView(paper, "general", panelSide);
    case "sole":
      return footExactSubForSideAreaView(paper, "sole", panelSide);
    case "toes":
      return footExactSubForSideAreaView(paper, "toes", panelSide);
    default:
      return false;
  }
}

/**
 * Foot L2 zoom on one panel: `general` matches only `foot → general` sites for that side.
 */
export function paperMatchesFootFineSelectionForSide(
  paper: BodySitesCarrier,
  hit: string,
  panelSide: FootDetailSide,
): boolean {
  return paperMatchesFootFineSelectionForSideDots(paper, hit, panelSide);
}

/** Foot L2 zoom (either side): used for filter chips and aggregate counts. */
export function paperMatchesFootFineSelection(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  return (
    paperMatchesFootFineSelectionForSide(paper, hit, "left") ||
    paperMatchesFootFineSelectionForSide(paper, hit, "right")
  );
}

/** Leg zoom map hit ids (general ring uses `general`). Paint order: later = on top. */
export const LEG_DETAIL_HIT_IDS = [
  "left-thigh",
  "right-thigh",
  "left-crural-region",
  "right-crural-region",
] as const;

export type LegDetailHitId = (typeof LEG_DETAIL_HIT_IDS)[number];

export type LegDetailSide = "left" | "right";

const LEG_DETAIL_HIT_ID_SET = new Set<string>([
  ...LEG_DETAIL_HIT_IDS,
  "general",
]);

/** True when a body site's optional `side` should appear on the given leg panel (filters / chips). */
export function legSiteMatchesPanelSide(
  site: { side?: string | null },
  panelSide: LegDetailSide,
): boolean {
  const sd = normalizeBodySiteSide(site.side);
  if (sd === panelSide) return true;
  if (sd === "unspecified") return true;
  return false;
}

function legExactSubForSideDots(
  paper: BodySitesCarrier,
  sub: string,
  panelSide: LegDetailSide,
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "leg") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (
      !siteAssignsToPanelSideForDots(
        s,
        panelSide,
        dotDistributionKey(paper, resolved, i),
      )
    ) {
      continue;
    }
    return true;
  }
  return false;
}

/** Leg L2 dot placement for one lateral hit id (unspecified sites distributed L/R). */
export function paperMatchesLegFineSelectionForSideDots(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return (
        legExactSubForSideDots(paper, "general", "left") ||
        legExactSubForSideDots(paper, "general", "right")
      );
    case "left-thigh":
      return legExactSubForSideDots(paper, "thigh", "left");
    case "right-thigh":
      return legExactSubForSideDots(paper, "thigh", "right");
    case "left-crural-region":
      return (
        legExactSubForSideDots(paper, "crural-region", "left") ||
        legExactSubForSideDots(paper, "crural", "left")
      );
    case "right-crural-region":
      return (
        legExactSubForSideDots(paper, "crural-region", "right") ||
        legExactSubForSideDots(paper, "crural", "right")
      );
    default:
      return false;
  }
}

function legExactSubForSideAreaView(
  paper: BodySitesCarrier,
  sub: string,
  panelSide: LegDetailSide,
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "leg") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (!siteAssignsToPanelSideForAreaView(s, panelSide)) continue;
    return true;
  }
  return false;
}

/** Leg L2 area view for one lateral hit id (unspecified duplicated on both sides). */
export function paperMatchesLegFineSelectionForSideAreaView(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return (
        legExactSubForSideAreaView(paper, "general", "left") ||
        legExactSubForSideAreaView(paper, "general", "right")
      );
    case "left-thigh":
      return legExactSubForSideAreaView(paper, "thigh", "left");
    case "right-thigh":
      return legExactSubForSideAreaView(paper, "thigh", "right");
    case "left-crural-region":
      return (
        legExactSubForSideAreaView(paper, "crural-region", "left") ||
        legExactSubForSideAreaView(paper, "crural", "left")
      );
    case "right-crural-region":
      return (
        legExactSubForSideAreaView(paper, "crural-region", "right") ||
        legExactSubForSideAreaView(paper, "crural", "right")
      );
    default:
      return false;
  }
}

/**
 * Leg L2 zoom on one panel: `general` matches only `leg → general` sites for that side.
 */
export function paperMatchesLegFineSelectionForSide(
  paper: BodySitesCarrier,
  hit: string,
  panelSide: LegDetailSide,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return legExactSubForSideDots(paper, "general", panelSide);
    case "thigh":
      return legExactSubForSideDots(paper, "thigh", panelSide);
    case "crural-region":
    case "crural":
      return (
        legExactSubForSideDots(paper, "crural-region", panelSide) ||
        legExactSubForSideDots(paper, "crural", panelSide)
      );
    default:
      return false;
  }
}

/** Leg L2 zoom on one bilateral map (single SVG, per-side hit targets). */
export function paperMatchesLegFineSelection(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return (
        paperMatchesLegFineSelectionForSide(paper, "general", "left") ||
        paperMatchesLegFineSelectionForSide(paper, "general", "right")
      );
    case "thigh":
      return (
        paperMatchesLegFineSelectionForSide(paper, "thigh", "left") ||
        paperMatchesLegFineSelectionForSide(paper, "thigh", "right")
      );
    case "left-thigh":
      return legExactSubForSideAreaView(paper, "thigh", "left");
    case "right-thigh":
      return legExactSubForSideAreaView(paper, "thigh", "right");
    case "crural-region":
    case "crural":
      return (
        legExactSubForSideAreaView(paper, "crural-region", "left") ||
        legExactSubForSideAreaView(paper, "crural", "left") ||
        legExactSubForSideAreaView(paper, "crural-region", "right") ||
        legExactSubForSideAreaView(paper, "crural", "right")
      );
    case "left-crural-region":
      return (
        legExactSubForSideAreaView(paper, "crural-region", "left") ||
        legExactSubForSideAreaView(paper, "crural", "left")
      );
    case "right-crural-region":
      return (
        legExactSubForSideAreaView(paper, "crural-region", "right") ||
        legExactSubForSideAreaView(paper, "crural", "right")
      );
    default:
      return false;
  }
}

/** True when a body site's optional `side` should appear on the given arm panel (filters / chips). */
export function armSiteMatchesPanelSide(
  site: { side?: string | null },
  panelSide: ArmDetailSide,
): boolean {
  const sd = normalizeBodySiteSide(site.side);
  if (sd === panelSide) return true;
  if (sd === "unspecified") return true;
  return false;
}

function dotDistributionKey(
  paper: BodySitesCarrier,
  resolved: BodyMapDetailRegion,
  siteIndex: number,
  siteIndexPrefix = "",
): string {
  const id = paperIdOf(paper);
  const indexToken = siteIndexPrefix
    ? `${siteIndexPrefix}${siteIndex}`
    : String(siteIndex);
  return `${id}\0${resolved.parent}\0${resolved.subregion}\0${indexToken}`;
}

function paperIdOf(paper: BodySitesCarrier): string {
  return "id" in paper && typeof paper.id === "string" ? paper.id : "";
}

function armExactSubForSideDots(
  paper: BodySitesCarrier,
  sub: string,
  panelSide: ArmDetailSide,
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "arm") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (
      !siteAssignsToPanelSideForDots(
        s,
        panelSide,
        dotDistributionKey(paper, resolved, i),
      )
    ) {
      continue;
    }
    return true;
  }
  return false;
}

/** Arm L2 dot placement on one panel (unspecified sites distributed L/R). */
export function paperMatchesArmFineSelectionForSideDots(
  paper: BodySitesCarrier,
  hit: string,
  panelSide: ArmDetailSide,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return armExactSubForSideDots(paper, "general", panelSide);
    case "upper-arm":
      return (
        armExactSubForSideDots(paper, "upper-arm", panelSide) ||
        armExactSubForSideDots(paper, "upper arm", panelSide)
      );
    case "forearm":
      return armExactSubForSideDots(paper, "forearm", panelSide);
    default:
      return false;
  }
}

function armExactSubForSideAreaView(
  paper: BodySitesCarrier,
  sub: string,
  panelSide: ArmDetailSide,
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "arm") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (!siteAssignsToPanelSideForAreaView(s, panelSide)) continue;
    return true;
  }
  return false;
}

/** Arm L2 area view on one panel (unspecified sites on both sides). */
export function paperMatchesArmFineSelectionForSideAreaView(
  paper: BodySitesCarrier,
  hit: string,
  panelSide: ArmDetailSide,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "general":
      return armExactSubForSideAreaView(paper, "general", panelSide);
    case "upper-arm":
      return (
        armExactSubForSideAreaView(paper, "upper-arm", panelSide) ||
        armExactSubForSideAreaView(paper, "upper arm", panelSide)
      );
    case "forearm":
      return armExactSubForSideAreaView(paper, "forearm", panelSide);
    default:
      return false;
  }
}

function headExactSubForSideDots(
  paper: BodySitesCarrier,
  sub: string,
  lateral: "left" | "right",
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "head") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (
      !siteAssignsToPanelSideForDots(
        s,
        lateral,
        dotDistributionKey(paper, resolved, i, "site"),
      )
    ) {
      continue;
    }
    return true;
  }
  return false;
}

/** Head L2 dot placement for one lateral hit id (unspecified sites distributed L/R). */
export function paperMatchesHeadFineSelectionForSideDots(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "left-ear":
      return headExactSubForSideDots(paper, "ear", "left");
    case "right-ear":
      return headExactSubForSideDots(paper, "ear", "right");
    case "left-cheek":
      return headExactSubForSideDots(paper, "cheek", "left");
    case "right-cheek":
      return headExactSubForSideDots(paper, "cheek", "right");
    default:
      return false;
  }
}

function headExactSubForSideAreaView(
  paper: BodySitesCarrier,
  sub: string,
  lateral: "left" | "right",
): boolean {
  const sites = paper.bodySites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const resolved = resolveBodySite(s);
    if (resolved.parent !== "head") continue;
    if (!subregionMatches(resolved.subregion, sub)) continue;
    if (!siteAssignsToPanelSideForAreaView(s, lateral)) continue;
    return true;
  }
  return false;
}

/** Head L2 area view for one lateral hit id (unspecified duplicated on both sides). */
export function paperMatchesHeadFineSelectionForSideAreaView(
  paper: BodySitesCarrier,
  hit: string,
): boolean {
  const h = hit.trim().toLowerCase();
  switch (h) {
    case "left-ear":
      return headExactSubForSideAreaView(paper, "ear", "left");
    case "right-ear":
      return headExactSubForSideAreaView(paper, "ear", "right");
    case "left-cheek":
      return headExactSubForSideAreaView(paper, "cheek", "left");
    case "right-cheek":
      return headExactSubForSideAreaView(paper, "cheek", "right");
    default:
      return false;
  }
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
      return headExactSubForSideAreaView(paper, "ear", "left");
    case "right-ear":
      return headExactSubForSideAreaView(paper, "ear", "right");
    case "left-cheek":
      return headExactSubForSideAreaView(paper, "cheek", "left");
    case "right-cheek":
      return headExactSubForSideAreaView(paper, "cheek", "right");
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

/**
 * Arm L2 zoom on one panel: `general` matches only `arm → general` sites for that side.
 */
export function paperMatchesArmFineSelectionForSide(
  paper: BodySitesCarrier,
  hit: string,
  panelSide: ArmDetailSide,
): boolean {
  return paperMatchesArmFineSelectionForSideDots(paper, hit, panelSide);
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
  side?: Extract<BodySiteSide, "left" | "right">,
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
    if (side) {
      return paperMatchesArmFineSelectionForSideAreaView(paper, needle, side);
    }
    return paperMatchesArmFineSelection(paper, needle);
  }

  if (parent === "hand" && HAND_DETAIL_HIT_ID_SET.has(needle)) {
    if (side) {
      return paperMatchesHandFineSelectionForSideAreaView(paper, needle, side);
    }
    return paperMatchesHandFineSelection(paper, needle);
  }

  if (parent === "foot" && FOOT_DETAIL_HIT_ID_SET.has(needle)) {
    if (side) {
      return paperMatchesFootFineSelectionForSideAreaView(paper, needle, side);
    }
    return paperMatchesFootFineSelection(paper, needle);
  }

  if (parent === "leg" && LEG_DETAIL_HIT_ID_SET.has(needle)) {
    return paperMatchesLegFineSelectionForSideAreaView(paper, needle);
  }

  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent !== parent) continue;
    if (resolved.subregion.trim().toLowerCase() === needle) return true;
  }
  return false;
}
