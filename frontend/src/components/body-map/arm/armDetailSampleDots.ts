import type { BodyMapDetailRegion } from "@/lib/research/bodyMapRegions";
import {
  resolveBodySite,
  type ArmDetailSide,
} from "@/lib/research/bodyMapRegionUtils";
import { siteAssignsToPanelSideForDots, siteAssignsToPanelSideForAreaView } from "@/lib/research/bodyMapSiteSide";
import type { ResearchPaper } from "@/type/researchPaper";
import { normalizeBodySites } from "@/lib/research/researchPapers";
import {
  type HeadShapeSampleOptions,
  type HeadShapeSpec,
  sampleDotsInHeadShape,
} from "@/components/body-map/head/headDetailSampleDots";
import {
  maxHitTargetCount,
  resolveAreaDensitySampleCount,
} from "@/components/body-map/bodyMapSampleDots";

export const ARM_LEFT_DETAIL_VIEWBOX = "0 0 281.3336 750.20129";
export const ARM_RIGHT_DETAIL_VIEWBOX = "0 0 282.18663 750.20129";

export type ArmShapeSpec = HeadShapeSpec;

/** Keep arm dots off the silhouette stroke without clustering in the centroid. */
function armDotSampleOptions(
  panelSide: ArmDetailSide,
  hitId: string,
): HeadShapeSampleOptions {
  const left = panelSide === "left";
  if (hitId === "forearm") {
    return {
      borderInset: left ? 8 : 6,
      minSpread: 0.18,
      maxSpread: 0.62,
    };
  }
  return {
    borderInset: left ? 10 : 7,
    minSpread: 0.14,
    maxSpread: 0.44,
  };
}

/**
 * Which arm-detail hit ids receive a dot for this body site on one panel (no dots for `general`).
 */
export function armContributionHitIds(
  site: { side?: string | null },
  resolved: BodyMapDetailRegion,
  panelSide: ArmDetailSide,
  distributionKey: string,
): string[] {
  if (resolved.parent !== "arm") return [];
  if (
    !siteAssignsToPanelSideForDots(site, panelSide, distributionKey)
  ) {
    return [];
  }
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

function armContributionHitIdsForAreaView(
  site: { side?: string | null },
  resolved: BodyMapDetailRegion,
  panelSide: ArmDetailSide,
): string[] {
  if (resolved.parent !== "arm") return [];
  if (!siteAssignsToPanelSideForAreaView(site, panelSide)) return [];
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
      const hits = armContributionHitIds(
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

export function collectArmDetailAreaTargetsByHit(
  papers: readonly ResearchPaper[],
  panelSide: ArmDetailSide,
): Map<string, { paperId: string; seed: string }[]> {
  const map = new Map<string, { paperId: string; seed: string }[]>();
  for (const paper of papers) {
    const sites = normalizeBodySites(paper);
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]!;
      const resolved = resolveBodySite(site);
      const hits = armContributionHitIdsForAreaView(site, resolved, panelSide);
      for (const hitId of hits) {
        let list = map.get(hitId);
        if (!list) {
          list = [];
          map.set(hitId, list);
        }
        list.push({
          paperId: paper.id,
          seed: `${paper.id}\0${resolved.parent}\0${resolved.subregion}\0${panelSide}\0area\0${i}`,
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
    const sampleOptions = armDotSampleOptions(panelSide, hitId);
    const capped = targets.slice(0, maxDotsPerHit);
    const pts: { x: number; y: number }[] = [];
    for (const t of capped) {
      const one = sampleDotsInHeadShape(spec, 1, t.seed, sampleOptions);
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
  const targetsByHit = collectArmDetailAreaTargetsByHit(papers, panelSide);
  const maxPaperCount = maxHitTargetCount(targetsByHit.values());
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    if (targets.length === 0) continue;
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const sampleOptions = armDotSampleOptions(panelSide, hitId);
    const sampleCount = resolveAreaDensitySampleCount(
      targets.length,
      maxPaperCount,
      samplesPerHit,
    );
    const seedTag = `arm-area-density\0${panelSide}\0${hitId}\0${sampleCount}\0${targets.length}`;
    out[hitId] = sampleDotsInHeadShape(
      spec,
      sampleCount,
      seedTag,
      sampleOptions,
    );
  }
  return out;
}
