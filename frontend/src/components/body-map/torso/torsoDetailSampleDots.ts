import type { BodyMapDetailRegion } from "@/lib/research/bodyMapRegions";
import { resolveBodySite } from "@/lib/research/bodyMapRegionUtils";
import {
  normalizeBodySites,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import {
  maxHitTargetCount,
  resolveAreaDensitySampleCount,
} from "../bodyMapSampleDots";
import type { HeadShapeSpec } from "../head/headDetailSampleDots";

export const TORSO_DETAIL_VIEWBOX = "0 0 438.83116 564";

export type TorsoPathSlice = { d: string; transform?: string };

export type TorsoShapeSpec =
  | HeadShapeSpec
  | {
      kind: "path-union";
      paths: readonly TorsoPathSlice[];
    };

function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function localPointToParentGroup(
  path: SVGPathElement,
  pl: SVGPoint,
): { x: number; y: number } {
  const svg = path.ownerSVGElement;
  const g = path.parentElement;
  if (!svg || !g || !(g instanceof SVGGElement)) {
    return { x: pl.x, y: pl.y };
  }
  const ctmPath = path.getCTM();
  const ctmG = g.getCTM();
  if (!ctmPath || !ctmG) {
    return { x: pl.x, y: pl.y };
  }
  const pVp = pl.matrixTransform(ctmPath);
  const pG = pVp.matrixTransform(ctmG.inverse());
  return { x: pG.x, y: pG.y };
}

function sampleDotsInTorsoPathUnion(
  paths: readonly TorsoPathSlice[],
  dotCount: number,
  seedTag: string,
): { x: number; y: number }[] {
  if (dotCount <= 0 || paths.length === 0 || typeof document === "undefined") {
    return [];
  }

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", TORSO_DETAIL_VIEWBOX);

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const pathEls: SVGPathElement[] = [];
  for (const p of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", p.d);
    if (p.transform) path.setAttribute("transform", p.transform);
    path.setAttribute("fill", "#000");
    g.appendChild(path);
    pathEls.push(path);
  }
  svg.appendChild(g);
  wrapper.appendChild(svg);
  document.body.appendChild(wrapper);

  try {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const path of pathEls) {
      const b = path.getBBox();
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) {
      return [];
    }

    const pt = svg.createSVGPoint();
    const geomKey = paths.map((p) => `${p.transform ?? ""}\0${p.d}`).join("\n");
    const seed = hashStringToSeed(`${seedTag}\0${geomKey}\0${dotCount}`);
    const rnd = mulberry32(seed === 0 ? 0x9e3779b9 : seed);
    const out: { x: number; y: number }[] = [];
    let attemptLimit = Math.min(600_000, Math.max(dotCount * 900, 20_000));
    const attemptCap = 1_200_000;
    let attempts = 0;

    while (out.length < dotCount) {
      while (out.length < dotCount && attempts < attemptLimit) {
        attempts += 1;
        const x = minX + rnd() * (maxX - minX);
        const y = minY + rnd() * (maxY - minY);
        pt.x = x;
        pt.y = y;
        let hit: SVGPathElement | null = null;
        for (const path of pathEls) {
          if (path.isPointInFill(pt)) {
            hit = path;
            break;
          }
        }
        if (!hit) continue;
        out.push(localPointToParentGroup(hit, pt));
      }
      if (out.length >= dotCount || attemptLimit >= attemptCap) break;
      attemptLimit = Math.min(attemptLimit * 2, attemptCap);
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    while (out.length < dotCount) {
      pt.x = cx;
      pt.y = cy;
      let pushed = false;
      for (const path of pathEls) {
        if (path.isPointInFill(pt)) {
          out.push(localPointToParentGroup(path, pt));
          pushed = true;
          break;
        }
      }
      if (!pushed) break;
    }
    return out.slice(0, dotCount);
  } finally {
    document.body.removeChild(wrapper);
  }
}

function sampleDotsInTorsoSinglePath(
  spec: Extract<TorsoShapeSpec, { kind: "path" }>,
  dotCount: number,
  seedTag: string,
): { x: number; y: number }[] {
  if (dotCount <= 0 || typeof document === "undefined") return [];

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", TORSO_DETAIL_VIEWBOX);

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  if (spec.transform) g.setAttribute("transform", spec.transform);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", spec.d);
  path.setAttribute("fill", "#000");
  g.appendChild(path);
  svg.appendChild(g);
  wrapper.appendChild(svg);
  document.body.appendChild(wrapper);

  try {
    const bbox = path.getBBox();
    const out: { x: number; y: number }[] = [];
    const pt = svg.createSVGPoint();
    const seed = hashStringToSeed(
      `${seedTag}\0${spec.transform ?? ""}\0${spec.d}\0${dotCount}`,
    );
    const rnd = mulberry32(seed === 0 ? 0x9e3779b9 : seed);
    let attemptLimit = Math.min(600_000, Math.max(dotCount * 900, 20_000));
    const attemptCap = 1_200_000;
    let attempts = 0;

    while (out.length < dotCount) {
      while (out.length < dotCount && attempts < attemptLimit) {
        attempts += 1;
        const x = bbox.x + rnd() * bbox.width;
        const y = bbox.y + rnd() * bbox.height;
        pt.x = x;
        pt.y = y;
        if (!path.isPointInFill(pt)) continue;
        out.push(localPointToParentGroup(path, pt));
      }
      if (out.length >= dotCount || attemptLimit >= attemptCap) break;
      attemptLimit = Math.min(attemptLimit * 2, attemptCap);
    }

    while (out.length < dotCount) {
      pt.x = bbox.x + bbox.width / 2;
      pt.y = bbox.y + bbox.height / 2;
      if (path.isPointInFill(pt)) {
        out.push(localPointToParentGroup(path, pt));
      } else {
        break;
      }
    }
    return out.slice(0, dotCount);
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function sampleDotsInTorsoShape(
  spec: TorsoShapeSpec,
  dotCount: number,
  seedTag: string,
): { x: number; y: number }[] {
  if (spec.kind === "path-union") {
    return sampleDotsInTorsoPathUnion(spec.paths, dotCount, seedTag);
  }
  if (spec.kind === "path") {
    return sampleDotsInTorsoSinglePath(spec, dotCount, seedTag);
  }
  return [];
}

/**
 * Which torso-detail hit ids receive a dot for this body site (no dots for `general`).
 */
export function torsoContributionHitIds(
  _site: { side?: string | null },
  resolved: BodyMapDetailRegion,
): string[] {
  if (resolved.parent !== "torso") return [];
  const sub = resolved.subregion.trim().toLowerCase();
  switch (sub) {
    case "general":
      return [];
    case "chest":
      return ["chest"];
    case "abdomen":
      return ["abdomen"];
    case "shoulder":
      return ["shoulder"];
    case "back":
      return ["back"];
    default:
      return [];
  }
}

export function collectTorsoDetailTargetsByHit(
  papers: readonly ResearchPaper[],
): Map<string, { paperId: string; seed: string }[]> {
  const map = new Map<string, { paperId: string; seed: string }[]>();
  for (const paper of papers) {
    const sites = normalizeBodySites(paper);
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]!;
      const resolved = resolveBodySite(site);
      const hits = torsoContributionHitIds(site, resolved);
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

export function buildTorsoDotsByHitId(
  papers: readonly ResearchPaper[],
  shapeByHitId: ReadonlyMap<string, TorsoShapeSpec>,
  maxDotsPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectTorsoDetailTargetsByHit(papers);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const capped = targets.slice(0, maxDotsPerHit);
    const pts: { x: number; y: number }[] = [];
    for (const t of capped) {
      const one = sampleDotsInTorsoShape(spec, 1, t.seed);
      if (one[0]) pts.push(one[0]);
    }
    out[hitId] = pts;
  }
  return out;
}

export function buildTorsoAreaDensityDotsByHitId(
  papers: readonly ResearchPaper[],
  shapeByHitId: ReadonlyMap<string, TorsoShapeSpec>,
  samplesPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectTorsoDetailTargetsByHit(papers);
  const maxPaperCount = maxHitTargetCount(targetsByHit.values());
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    if (targets.length === 0) continue;
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const sampleCount = resolveAreaDensitySampleCount(
      targets.length,
      maxPaperCount,
      samplesPerHit,
    );
    const seedTag = `torso-area-density\0${hitId}\0${sampleCount}\0${targets.length}`;
    out[hitId] = sampleDotsInTorsoShape(spec, sampleCount, seedTag);
  }
  return out;
}
