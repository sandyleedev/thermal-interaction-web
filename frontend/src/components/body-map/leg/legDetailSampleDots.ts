import type { BodyMapDetailRegion } from "@/lib/research/bodyMapRegions";
import { resolveBodySite } from "@/lib/research/bodyMapRegionUtils";
import {
  normalizeBodySiteSide,
  siteAssignsToLateralHitForDots,
} from "@/lib/research/bodyMapSiteSide";
import {
  normalizeBodySites,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import {
  type HeadShapeSampleOptions,
  type HeadShapeSpec,
  sampleDotsInHeadShape,
} from "../head/headDetailSampleDots";

/** Small pad so the general-ring stroke is not clipped at the SVG bottom edge. */
export const LEG_DETAIL_VIEWBOX_STROKE_PAD = 20;

/** Fallback when leg.svg viewBox cannot be read. */
export const LEG_DETAIL_VIEWBOX_FALLBACK = "0 0 522.10726 1730.7358";

export function resolveLegDetailViewBox(rawViewBox: string): string {
  const parts = rawViewBox.trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return LEG_DETAIL_VIEWBOX_FALLBACK;
  }
  const [x, y, w, h] = parts;
  return `${x} ${y} ${w} ${h + LEG_DETAIL_VIEWBOX_STROKE_PAD}`;
}

export const LEG_DETAIL_VIEWBOX = resolveLegDetailViewBox(
  "0 0 522.10726 1710.7358",
);

export type LegShapeSpec = HeadShapeSpec;

function legDotSampleOptions(hitId: string): HeadShapeSampleOptions {
  if (hitId.includes("crural")) {
    return { borderInset: 10, minSpread: 0.12, maxSpread: 0.48 };
  }
  return { borderInset: 12, minSpread: 0.14, maxSpread: 0.52 };
}

/**
 * Which leg-detail hit ids receive a dot for this body site (no dots for `general`).
 */
export function legContributionHitIds(
  site: { side?: string },
  resolved: BodyMapDetailRegion,
  distributionKey: string,
): string[] {
  if (resolved.parent !== "leg") return [];
  const sub = resolved.subregion.trim().toLowerCase();
  const normalized = normalizeBodySiteSide(site.side);
  switch (sub) {
    case "general":
      return [];
    case "thigh":
      if (normalized === "left") return ["left-thigh"];
      if (normalized === "right") return ["right-thigh"];
      return [
        siteAssignsToLateralHitForDots(site, "left", distributionKey)
          ? "left-thigh"
          : "right-thigh",
      ];
    case "crural":
    case "crural-region":
      if (normalized === "left") return ["left-crural-region"];
      if (normalized === "right") return ["right-crural-region"];
      return [
        siteAssignsToLateralHitForDots(site, "left", distributionKey)
          ? "left-crural-region"
          : "right-crural-region",
      ];
    default:
      return [];
  }
}

export function collectLegDetailTargetsByHit(
  papers: readonly ResearchPaper[],
): Map<string, { paperId: string; seed: string }[]> {
  const map = new Map<string, { paperId: string; seed: string }[]>();
  for (const paper of papers) {
    const sites = normalizeBodySites(paper);
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]!;
      const resolved = resolveBodySite(site);
      const hits = legContributionHitIds(
        site,
        resolved,
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
          seed: `${paper.id}\0${resolved.parent}\0${resolved.subregion}\0${site.side ?? ""}\0${i}`,
        });
      }
    }
  }
  return map;
}

export function buildLegDotsByHitId(
  papers: readonly ResearchPaper[],
  shapeByHitId: ReadonlyMap<string, LegShapeSpec>,
  maxDotsPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectLegDetailTargetsByHit(papers);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const sampleOptions = legDotSampleOptions(hitId);
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

export function buildLegAreaDensityDotsByHitId(
  papers: readonly ResearchPaper[],
  shapeByHitId: ReadonlyMap<string, LegShapeSpec>,
  samplesPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectLegDetailTargetsByHit(papers);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    if (targets.length === 0) continue;
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const sampleOptions = legDotSampleOptions(hitId);
    const seedTag = `leg-area-density\0${hitId}\0${samplesPerHit}`;
    out[hitId] = sampleDotsInHeadShape(
      spec,
      samplesPerHit,
      seedTag,
      sampleOptions,
    );
  }
  return out;
}
