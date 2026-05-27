import type { BodyMapDetailRegion } from "@/lib/research/bodyMapRegions";
import {
  resolveBodySite,
  type FootDetailSide,
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
import {
  maxHitTargetCount,
  resolveAreaDensitySampleCount,
} from "../bodyMapSampleDots";

export const FOOT_DETAIL_VIEWBOX = "0 0 383.11667 287.33749";

export type FootShapeSpec = HeadShapeSpec;

function footDotSampleOptions(hitId: string): HeadShapeSampleOptions {
  if (hitId === "toes") {
    return { borderInset: 6, minSpread: 0.1, maxSpread: 0.45 };
  }
  return { borderInset: 8, minSpread: 0.14, maxSpread: 0.52 };
}

/**
 * Which foot-detail hit ids receive a dot for this body site on one panel (no dots for `general`).
 */
export function footContributionHitIds(
  site: { side?: string },
  resolved: BodyMapDetailRegion,
  panelSide: FootDetailSide,
  distributionKey: string,
): string[] {
  if (resolved.parent !== "foot") return [];
  if (
    !siteAssignsToPanelSideForDots(site, panelSide, distributionKey)
  ) {
    return [];
  }
  const sub = resolved.subregion.trim().toLowerCase();
  if (sub === "general") return [];
  if (sub === "sole" || sub === "toes") return [sub];
  return [];
}

export function collectFootDetailTargetsByHit(
  papers: readonly ResearchPaper[],
  panelSide: FootDetailSide,
): Map<string, { paperId: string; seed: string }[]> {
  const map = new Map<string, { paperId: string; seed: string }[]>();
  for (const paper of papers) {
    const sites = normalizeBodySites(paper);
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]!;
      const resolved = resolveBodySite(site);
      const hits = footContributionHitIds(
        site,
        resolved,
        panelSide,
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
          seed: `${paper.id}\0${resolved.parent}\0${resolved.subregion}\0${panelSide}\0${i}`,
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

export function buildFootDotsByHitId(
  papers: readonly ResearchPaper[],
  panelSide: FootDetailSide,
  shapeByHitId: ReadonlyMap<string, FootShapeSpec>,
  maxDotsPerHit: number,
  viewBoxWidth: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectFootDetailTargetsByHit(papers, panelSide);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const sampleOptions = footDotSampleOptions(hitId);
    const capped = targets.slice(0, maxDotsPerHit);
    const pts: { x: number; y: number }[] = [];
    for (const t of capped) {
      const one = sampleDotsInHeadShape(spec, 1, t.seed, sampleOptions);
      if (one[0]) pts.push(one[0]);
    }
    out[hitId] = pts;
  }
  return panelSide === "right"
    ? flipDotsHorizontally(out, viewBoxWidth)
    : out;
}

export function buildFootAreaDensityDotsByHitId(
  papers: readonly ResearchPaper[],
  panelSide: FootDetailSide,
  shapeByHitId: ReadonlyMap<string, FootShapeSpec>,
  samplesPerHit: number,
  viewBoxWidth: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectFootDetailTargetsByHit(papers, panelSide);
  const maxPaperCount = maxHitTargetCount(targetsByHit.values());
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    if (targets.length === 0) continue;
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const sampleOptions = footDotSampleOptions(hitId);
    const sampleCount = resolveAreaDensitySampleCount(
      targets.length,
      maxPaperCount,
      samplesPerHit,
    );
    const seedTag = `foot-area-density\0${panelSide}\0${hitId}\0${sampleCount}\0${targets.length}`;
    out[hitId] = sampleDotsInHeadShape(
      spec,
      sampleCount,
      seedTag,
      sampleOptions,
    );
  }
  return panelSide === "right"
    ? flipDotsHorizontally(out, viewBoxWidth)
    : out;
}
