import type { BodyMapParentRegion } from "@/lib/research/bodyMapRegions";
import { resolveBodySite, type BodySitesCarrier } from "@/lib/research/bodyMapRegionUtils";

export type BodySiteSide = "left" | "right" | "unspecified";

export type BodyMapHoverTooltipLine = {
  label: string;
  count: number;
};

/** Normalize raw JSON / legacy values to a canonical lateral side. */
export function normalizeBodySiteSide(side?: string): BodySiteSide {
  const sd = (side ?? "").trim().toLowerCase();
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
export function distributedSideForSite(distributionKey: string): "left" | "right" {
  return hashStringToSeed(distributionKey) % 2 === 0 ? "left" : "right";
}

export function siteAssignsToPanelSideForDots(
  site: { side?: string },
  panelSide: "left" | "right",
  distributionKey: string,
): boolean {
  const normalized = normalizeBodySiteSide(site.side);
  if (normalized === "left") return panelSide === "left";
  if (normalized === "right") return panelSide === "right";
  return distributedSideForSite(distributionKey) === panelSide;
}

export function siteAssignsToLateralHitForDots(
  site: { side?: string },
  hitSide: "left" | "right",
  distributionKey: string,
): boolean {
  return siteAssignsToPanelSideForDots(site, hitSide, distributionKey);
}

const BILATERAL_BODY_MAP_PARENTS = new Set<BodyMapParentRegion>([
  "arm",
  "hand",
  "leg",
  "foot",
  "wrist",
  "ankle",
]);

export function isBilateralBodyMapParent(
  parent: BodyMapParentRegion,
): boolean {
  return BILATERAL_BODY_MAP_PARENTS.has(parent);
}

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

export function formatPaperCount(count: number): string {
  return `${count.toLocaleString()} paper${count === 1 ? "" : "s"}`;
}

/** Two-line bilateral tooltip: total subregion count, optional explicit side count. */
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
