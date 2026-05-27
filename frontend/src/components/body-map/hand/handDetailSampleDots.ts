import type { BodyMapDetailRegion } from "@/lib/research/bodyMapRegions";
import {
  resolveBodySite,
  type HandDetailPanel,
  type HandDetailSurface,
} from "@/lib/research/bodyMapRegionUtils";
import { siteAssignsToPanelSideForDots } from "@/lib/research/bodyMapSiteSide";
import {
  normalizeBodySites,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import {
  type HeadShapeSampleOptions,
  type HeadShapeSpec,
  sampleDotsInHeadShape,
} from "../head/headDetailSampleDots";

export const HAND_INNER_DETAIL_VIEWBOX = "0 0 128.92683 276.27176";
export const HAND_OUTER_DETAIL_VIEWBOX = "0 0 131.05411 266.55075";

export type HandShapeSpec = HeadShapeSpec;

function handDotSampleOptions(
  panel: HandDetailPanel,
  hitId: string,
): HeadShapeSampleOptions {
  if (hitId === "fingertips") {
    return { borderInset: 6, minSpread: 0.08, maxSpread: 0.42 };
  }
  if (panel.surface === "outer") {
    return { borderInset: 8, minSpread: 0.12, maxSpread: 0.48 };
  }
  return { borderInset: 7, minSpread: 0.14, maxSpread: 0.52 };
}

function handSurfaceForSubregion(sub: string): HandDetailSurface | null {
  switch (sub) {
    case "palm":
    case "fingertips":
    case "fingers":
    case "thenar-eminence":
      return "inner";
    case "hand-back":
      return "outer";
    default:
      return null;
  }
}

/**
 * Which hand-detail hit ids receive a dot for this body site on one panel (no dots for `general`).
 */
export function handContributionHitIds(
  site: { side?: string },
  resolved: BodyMapDetailRegion,
  panel: HandDetailPanel,
  distributionKey: string,
): string[] {
  if (resolved.parent !== "hand") return [];
  if (
    !siteAssignsToPanelSideForDots(site, panel.side, distributionKey)
  ) {
    return [];
  }
  const sub = resolved.subregion.trim().toLowerCase();
  if (sub === "general") return [];
  const surface = handSurfaceForSubregion(sub);
  if (surface !== panel.surface) return [];
  return [sub];
}

export function collectHandDetailTargetsByHit(
  papers: readonly ResearchPaper[],
  panel: HandDetailPanel,
): Map<string, { paperId: string; seed: string }[]> {
  const map = new Map<string, { paperId: string; seed: string }[]>();
  for (const paper of papers) {
    const sites = normalizeBodySites(paper);
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]!;
      const resolved = resolveBodySite(site);
      const hits = handContributionHitIds(
        site,
        resolved,
        panel,
        `${paper.id}\0${resolved.parent}\0${resolved.subregion}\0${i}`,
      );
      for (const hitId of hits) {
        let list = map.get(hitId);
        if (!list) {
          list = [];
          map.set(hitId, list);
        }
        list.push({
          paperId: paper.id,
          seed: `${paper.id}\0${resolved.parent}\0${resolved.subregion}\0${panel.surface}\0${panel.side}\0${i}`,
        });
      }
    }
  }
  return map;
}

function flipDotsHorizontally(
  dots: Record<string, { x: number; y: number }[]>,
  viewBoxWidth: number,
): Record<string, { x: number; y: number }[]> {
  if (viewBoxWidth <= 0) return dots;
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, pts] of Object.entries(dots)) {
    out[hitId] = pts.map((p) => ({ x: viewBoxWidth - p.x, y: p.y }));
  }
  return out;
}

export function buildHandDotsByHitId(
  papers: readonly ResearchPaper[],
  panel: HandDetailPanel,
  shapeByHitId: ReadonlyMap<string, HandShapeSpec>,
  maxDotsPerHit: number,
  viewBoxWidth: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectHandDetailTargetsByHit(papers, panel);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const sampleOptions = handDotSampleOptions(panel, hitId);
    const capped = targets.slice(0, maxDotsPerHit);
    const pts: { x: number; y: number }[] = [];
    for (const t of capped) {
      const one = sampleDotsInHeadShape(spec, 1, t.seed, sampleOptions);
      if (one[0]) pts.push(one[0]);
    }
    out[hitId] = pts;
  }
  return panel.side === "right"
    ? flipDotsHorizontally(out, viewBoxWidth)
    : out;
}

export function buildHandAreaDensityDotsByHitId(
  papers: readonly ResearchPaper[],
  panel: HandDetailPanel,
  shapeByHitId: ReadonlyMap<string, HandShapeSpec>,
  samplesPerHit: number,
  viewBoxWidth: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectHandDetailTargetsByHit(papers, panel);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    if (targets.length === 0) continue;
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const sampleOptions = handDotSampleOptions(panel, hitId);
    const seedTag = `hand-area-density\0${panel.surface}\0${panel.side}\0${hitId}\0${samplesPerHit}`;
    out[hitId] = sampleDotsInHeadShape(
      spec,
      samplesPerHit,
      seedTag,
      sampleOptions,
    );
  }
  return panel.side === "right"
    ? flipDotsHorizontally(out, viewBoxWidth)
    : out;
}
