import type { BodyMapDetailRegion } from "@/lib/research/bodyMapRegions";
import { resolveBodySite } from "@/lib/research/bodyMapRegionUtils";
import { normalizeBodySites, type ResearchPaper } from "@/lib/research/researchPapers";
import {
  type HeadShapeSpec,
  sampleDotsInHeadShape,
} from "../head/headDetailSampleDots";

export const NECK_DETAIL_VIEWBOX = "0 0 210 297";

export type NeckShapeSpec = HeadShapeSpec;

/**
 * Which neck-detail hit ids receive a dot for this body site (no dots for `general`).
 */
export function neckContributionHitIds(
  _site: { side?: string },
  resolved: BodyMapDetailRegion,
): string[] {
  if (resolved.parent !== "neck") return [];
  const sub = resolved.subregion.trim().toLowerCase();
  switch (sub) {
    case "general":
      return [];
    case "anterior":
      return ["anterior"];
    case "posterior":
      return ["posterior"];
    default:
      return [];
  }
}

export function collectNeckDetailTargetsByHit(
  papers: readonly ResearchPaper[],
): Map<string, { paperId: string; seed: string }[]> {
  const map = new Map<string, { paperId: string; seed: string }[]>();
  for (const paper of papers) {
    const sites = normalizeBodySites(paper);
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]!;
      const resolved = resolveBodySite(site);
      const hits = neckContributionHitIds(site, resolved);
      for (const hitId of hits) {
        let list = map.get(hitId);
        if (!list) {
          list = [];
          map.set(hitId, list);
        }
        list.push({
          paperId: paper.id,
          seed: `${paper.id}\0${resolved.parent}\0${resolved.subregion}\0${i}`,
        });
      }
    }
  }
  return map;
}

export function buildNeckDotsByHitId(
  papers: readonly ResearchPaper[],
  shapeByHitId: ReadonlyMap<string, NeckShapeSpec>,
  maxDotsPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectNeckDetailTargetsByHit(papers);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const capped = targets.slice(0, maxDotsPerHit);
    const pts: { x: number; y: number }[] = [];
    for (const t of capped) {
      const one = sampleDotsInHeadShape(spec, 1, t.seed);
      if (one[0]) pts.push(one[0]);
    }
    out[hitId] = pts;
  }
  return out;
}

export function buildNeckAreaDensityDotsByHitId(
  papers: readonly ResearchPaper[],
  shapeByHitId: ReadonlyMap<string, NeckShapeSpec>,
  samplesPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectNeckDetailTargetsByHit(papers);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    if (targets.length === 0) continue;
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const seedTag = `neck-area-density\0${hitId}\0${samplesPerHit}`;
    out[hitId] = sampleDotsInHeadShape(spec, samplesPerHit, seedTag);
  }
  return out;
}
