import type { BodyMapParentRegion } from "@/lib/research/bodyMapRegions";
import {
  resolveBodySite,
  type BodySitesCarrier,
} from "@/lib/research/bodyMapRegionUtils";

/** Stored in JSON: explicit laterality, or null when unknown. */
export type BodySiteSide = "left" | "right" | null;

/** Resolved side for matching / dot placement (null in data → unspecified). */
export type ResolvedBodySiteSide = "left" | "right" | "unspecified";

export type BodyMapHoverTooltipLine = {
  label: string;
  count: number;
};

/** Normalize raw JSON (null, legacy "unspecified") to a canonical lateral side. */
export function normalizeBodySiteSide(
  side?: BodySiteSide | string | null,
): ResolvedBodySiteSide {
  if (side == null) return "unspecified";
  const sd = String(side).trim().toLowerCase();
  if (sd === "left") return "left";
  if (sd === "right") return "right";
  return "unspecified";
}

export function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic left/right pick so unspecified sites split ~evenly across panels. */
export function distributedSideForSite(
  distributionKey: string,
): "left" | "right" {
  return hashStringToSeed(distributionKey) % 2 === 0 ? "left" : "right";
}

export function siteAssignsToPanelSideForDots(
  site: { side?: string | null },
  panelSide: "left" | "right",
  distributionKey: string,
): boolean {
  const normalized = normalizeBodySiteSide(site.side);
  if (normalized === "left") return panelSide === "left";
  if (normalized === "right") return panelSide === "right";
  return distributedSideForSite(distributionKey) === panelSide;
}

/**
 * Detail area view + body-map chip filter: explicit left/right stay on one side;
 * unspecified appears on both (dot placement still uses {@link siteAssignsToPanelSideForDots}).
 */
export function siteAssignsToPanelSideForAreaView(
  site: { side?: string | null },
  panelSide: "left" | "right",
): boolean {
  const normalized = normalizeBodySiteSide(site.side);
  if (normalized === "left") return panelSide === "left";
  if (normalized === "right") return panelSide === "right";
  return true;
}

export function siteAssignsToLateralHitForDots(
  site: { side?: string | null },
  hitSide: "left" | "right",
  distributionKey: string,
): boolean {
  return siteAssignsToPanelSideForDots(site, hitSide, distributionKey);
}

/** List of body regions that have both sides (left and right). */
const BILATERAL_BODY_MAP_PARENTS = new Set<BodyMapParentRegion>([
  "arm",
  "hand",
  "leg",
  "foot",
  "wrist",
  "ankle",
]);

/** Check if a parent is bilateral. */
export function isBilateralBodyMapParent(parent: BodyMapParentRegion): boolean {
  return BILATERAL_BODY_MAP_PARENTS.has(parent);
}

/** Check if a subregion matches another subregion. */
export function subregionMatches(a: string, b: string): boolean {
  const al = a.trim().toLowerCase();
  const bl = b.trim().toLowerCase();
  if (al === bl) return true;
  if (al === "upper arm" && bl === "upper-arm") return true;
  if (al === "upper-arm" && bl === "upper arm") return true;
  if (
    (al === "crural" || al === "crural-region") &&
    (bl === "crural" || bl === "crural-region")
  ) {
    return true;
  }
  return false;
}

/** Check if a paper has an explicit side for a site. - singular count*/
export function paperHasExplicitSideForSite(
  paper: BodySitesCarrier,
  parent: BodyMapParentRegion,
  subregion: string,
  side: "left" | "right",
): boolean {
  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent !== parent) continue;
    if (!subregionMatches(resolved.subregion, subregion)) continue;
    if (normalizeBodySiteSide(s.side) !== side) continue;
    return true;
  }
  return false;
}

/** Check if a paper has an explicit side for a site. - array count*/
export function countPapersWithExplicitSideForSite(
  papers: readonly BodySitesCarrier[],
  parent: BodyMapParentRegion,
  subregion: string,
  side: "left" | "right",
): number {
  let n = 0;
  for (const p of papers) {
    if (paperHasExplicitSideForSite(p, parent, subregion, side)) n += 1;
  }
  return n;
}

/** Check if a paper has an explicit side for a parent. - singular count*/
export function paperHasExplicitSideForParent(
  paper: BodySitesCarrier,
  parent: BodyMapParentRegion,
  side: "left" | "right",
): boolean {
  for (const s of paper.bodySites ?? []) {
    const resolved = resolveBodySite(s);
    if (resolved.parent !== parent) continue;
    if (normalizeBodySiteSide(s.side) !== side) continue;
    return true;
  }
  return false;
}

/** Count papers that match a predicate. - array count*/
export function countPapersWithExplicitSideForParent(
  papers: readonly BodySitesCarrier[],
  parent: BodyMapParentRegion,
  side: "left" | "right",
): number {
  let n = 0;
  for (const p of papers) {
    if (paperHasExplicitSideForParent(p, parent, side)) n += 1;
  }
  return n;
}

/** Format a paper count as a string with pluralization. - paper / papers */
export function formatPaperCount(count: number): string {
  return `${count.toLocaleString()} paper${count === 1 ? "" : "s"}`;
}

/** Make Two-line bilateral tooltip: total subregion count, optional explicit side count. */
export function buildBilateralHoverTooltipLines(
  totalLabel: string,
  totalCount: number,
  sidePrefix: "left" | "right" | null,
  sideSubregionLabel: string,
  sideCount: number,
): BodyMapHoverTooltipLine[] {
  const lines: BodyMapHoverTooltipLine[] = [
    { label: totalLabel, count: totalCount },
  ];
  if (sidePrefix != null && sideCount > 0) {
    lines.push({
      label: `${sidePrefix} ${sideSubregionLabel}`,
      count: sideCount,
    });
  }
  return lines;
}
