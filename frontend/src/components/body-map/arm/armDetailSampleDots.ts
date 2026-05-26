import type { BodyMapDetailRegion } from "@/lib/research/bodyMapRegions";
import {
  armSiteMatchesPanelSide,
  resolveBodySite,
  type ArmDetailSide,
} from "@/lib/research/bodyMapRegionUtils";
import {
  normalizeBodySites,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import {
  type HeadShapeSpec,
  sampleDotsInHeadShape,
} from "../head/headDetailSampleDots";

export const ARM_LEFT_DETAIL_VIEWBOX = "0 0 281.3336 750.20129";
export const ARM_RIGHT_DETAIL_VIEWBOX = "0 0 282.18663 750.20129";

export type ArmShapeSpec = HeadShapeSpec;

/**
 * Which arm-detail hit ids receive a dot for this body site on one panel (no dots for `general`).
 */
export function armContributionHitIds(
  site: { side?: string },
  resolved: BodyMapDetailRegion,
  panelSide: ArmDetailSide,
): string[] {
  if (resolved.parent !== "arm") return [];
  if (!armSiteMatchesPanelSide(site, panelSide)) return [];
  const sub = resolved.subregion.trim().toLowerCase();
  switch (sub) {
    case "general":
      return [];
    case "upper-arm":
    case "upper arm":
      return ["upper-arm"];
    case "forearm":
      return ["forearm"];
    default:
      return [];
  }
}

export function collectArmDetailTargetsByHit(
  papers: readonly ResearchPaper[],
  panelSide: ArmDetailSide,
): Map<string, { paperId: string; seed: string }[]> {
  const map = new Map<string, { paperId: string; seed: string }[]>();
  for (const paper of papers) {
    const sites = normalizeBodySites(paper);
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]!;
      const resolved = resolveBodySite(site);
      const hits = armContributionHitIds(site, resolved, panelSide);
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

export function buildArmDotsByHitId(
  papers: readonly ResearchPaper[],
  panelSide: ArmDetailSide,
  shapeByHitId: ReadonlyMap<string, ArmShapeSpec>,
  maxDotsPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectArmDetailTargetsByHit(papers, panelSide);
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

export function buildArmAreaDensityDotsByHitId(
  papers: readonly ResearchPaper[],
  panelSide: ArmDetailSide,
  shapeByHitId: ReadonlyMap<string, ArmShapeSpec>,
  samplesPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectArmDetailTargetsByHit(papers, panelSide);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    if (targets.length === 0) continue;
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const seedTag = `arm-area-density\0${panelSide}\0${hitId}\0${samplesPerHit}`;
    out[hitId] = sampleDotsInHeadShape(spec, samplesPerHit, seedTag);
  }
  return out;
}
