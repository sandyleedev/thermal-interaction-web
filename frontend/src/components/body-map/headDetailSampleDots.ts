import type { BodyMapDetailRegion } from "@/lib/research/bodyMapRegions";
import { resolveBodySite } from "@/lib/research/bodyMapRegionUtils";
import { normalizeBodySites, type ResearchPaper } from "@/lib/research/researchPapers";

export const HEAD_DETAIL_VIEWBOX = "0 0 210 297";

/** Monte Carlo centroid in shape fill space, keyed by geometry only (shared across papers). */
const headShapeCentroidCache = new Map<string, { x: number; y: number }>();

export type HeadShapeSpec =
  | {
      kind: "path";
      d: string;
      transform?: string;
    }
  | {
      kind: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      transform?: string;
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

/**
 * Which head-detail hit ids receive a dot for this body site (no dots for `general`).
 */
export function headContributionHitIds(
  site: { side?: string },
  resolved: BodyMapDetailRegion,
): string[] {
  if (resolved.parent !== "head") return [];
  const sub = resolved.subregion.trim().toLowerCase();
  const sd = (site.side ?? "").trim().toLowerCase();
  switch (sub) {
    case "general":
      return [];
    case "forehead":
      return ["forehead"];
    case "nose":
      return ["nose"];
    case "lip":
      return ["lip"];
    case "tongue":
      return ["tongue"];
    case "ear":
      if (sd === "left") return ["left-ear"];
      if (sd === "right") return ["right-ear"];
      return ["left-ear", "right-ear"];
    case "cheek":
      if (sd === "left") return ["left-cheek"];
      if (sd === "right") return ["right-cheek"];
      return ["left-cheek", "right-cheek"];
    default:
      return [];
  }
}

export type HeadDotTarget = { paperId: string; seed: string };

export function collectHeadDetailTargetsByHit(
  papers: readonly ResearchPaper[],
): Map<string, HeadDotTarget[]> {
  const map = new Map<string, HeadDotTarget[]>();
  for (const p of papers) {
    const sites = normalizeBodySites(p);
    for (let si = 0; si < sites.length; si++) {
      const site = sites[si];
      const resolved = resolveBodySite(site);
      const ids = headContributionHitIds(site, resolved);
      for (const hid of ids) {
        const arr = map.get(hid) ?? [];
        arr.push({
          paperId: p.id,
          seed: `${p.id}\0${hid}\0site${si}`,
        });
        map.set(hid, arr);
      }
    }
  }
  return map;
}

/**
 * Rejection sample inside a head subpart path or ellipse (head SVG user space).
 */
export function sampleDotsInHeadShape(
  spec: HeadShapeSpec,
  dotCount: number,
  seedTag: string,
): { x: number; y: number }[] {
  if (dotCount <= 0 || typeof document === "undefined") return [];

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", HEAD_DETAIL_VIEWBOX);

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  if (spec.transform) g.setAttribute("transform", spec.transform);

  let shape: SVGPathElement | SVGEllipseElement;
  if (spec.kind === "path") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", spec.d);
    path.setAttribute("fill", "#000");
    shape = path;
  } else {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    el.setAttribute("cx", String(spec.cx));
    el.setAttribute("cy", String(spec.cy));
    el.setAttribute("rx", String(spec.rx));
    el.setAttribute("ry", String(spec.ry));
    el.setAttribute("fill", "#000");
    shape = el;
  }

  g.appendChild(shape);
  svg.appendChild(g);
  wrapper.appendChild(svg);
  document.body.appendChild(wrapper);

  try {
    const bbox = shape.getBBox();
    const out: { x: number; y: number }[] = [];
    const pt = svg.createSVGPoint();
    const seed = hashStringToSeed(
      `${seedTag}\0${spec.kind === "path" ? spec.d : `${spec.cx},${spec.cy}`}\0${dotCount}`,
    );
    const rnd = mulberry32(seed === 0 ? 0x9e3779b9 : seed);

    const transformTag = spec.transform ?? "";
    const shapeGeomKey =
      spec.kind === "path"
        ? `${transformTag}\0${spec.d}`
        : `${transformTag}\0${spec.cx},${spec.cy},${spec.rx},${spec.ry}`;

    let anchorX: number;
    let anchorY: number;
    const cached = headShapeCentroidCache.get(shapeGeomKey);
    if (cached) {
      anchorX = cached.x;
      anchorY = cached.y;
    } else {
      anchorX = bbox.x + bbox.width / 2;
      anchorY = bbox.y + bbox.height / 2;
      const centroidRnd = mulberry32(
        hashStringToSeed(`head-shape-centroid\0${shapeGeomKey}`),
      );
      let sx = 0;
      let sy = 0;
      let sn = 0;
      const targetSamples = spec.kind === "path" ? 64 : 32;
      const maxTries = spec.kind === "path" ? 14_000 : 6000;
      for (let i = 0; i < maxTries && sn < targetSamples; i++) {
        const ux = bbox.x + centroidRnd() * bbox.width;
        const uy = bbox.y + centroidRnd() * bbox.height;
        pt.x = ux;
        pt.y = uy;
        if (!shape.isPointInFill(pt)) continue;
        sx += ux;
        sy += uy;
        sn += 1;
      }
      if (sn > 0) {
        anchorX = sx / sn;
        anchorY = sy / sn;
      }
      headShapeCentroidCache.set(shapeGeomKey, { x: anchorX, y: anchorY });
    }

    const pushToSvgUser = (x: number, y: number) => {
      pt.x = x;
      pt.y = y;
      const ctm = shape.getCTM();
      const gCtm = g.getCTM();
      if (!ctm || !gCtm) {
        out.push({ x, y });
        return;
      }
      const pVp = pt.matrixTransform(ctm);
      const pG = pVp.matrixTransform(gCtm.inverse());
      out.push({ x: pG.x, y: pG.y });
    };

    let attemptLimit = Math.min(600_000, Math.max(dotCount * 900, 20_000));
    const attemptCap = 1_200_000;
    let attempts = 0;

    while (out.length < dotCount) {
      while (out.length < dotCount && attempts < attemptLimit) {
        attempts += 1;
        const ux = bbox.x + rnd() * bbox.width;
        const uy = bbox.y + rnd() * bbox.height;
        const w = 0.1 + rnd() * 0.42;
        const x = anchorX + (ux - anchorX) * w;
        const y = anchorY + (uy - anchorY) * w;
        pt.x = x;
        pt.y = y;
        if (!shape.isPointInFill(pt)) continue;
        pushToSvgUser(x, y);
      }
      if (out.length >= dotCount || attemptLimit >= attemptCap) break;
      attemptLimit = Math.min(attemptLimit * 2, attemptCap);
    }

    while (out.length < dotCount) {
      pt.x = anchorX;
      pt.y = anchorY;
      if (shape.isPointInFill(pt)) {
        pushToSvgUser(anchorX, anchorY);
      } else {
        out.push({ x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 });
      }
    }
    return out.slice(0, dotCount);
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function buildHeadDotsByHitId(
  papers: readonly ResearchPaper[],
  shapeByHitId: ReadonlyMap<string, HeadShapeSpec>,
  maxDotsPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectHeadDetailTargetsByHit(papers);
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

/**
 * Area view (rawDots): dense samples inside each fine head region for KDE, same role as
 * {@link sampleHeatmapAreaDensityDots} on the full-body map.
 */
export function buildHeadAreaDensityDotsByHitId(
  papers: readonly ResearchPaper[],
  shapeByHitId: ReadonlyMap<string, HeadShapeSpec>,
  samplesPerHit: number,
): Record<string, { x: number; y: number }[]> {
  const targetsByHit = collectHeadDetailTargetsByHit(papers);
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [hitId, targets] of targetsByHit) {
    if (targets.length === 0) continue;
    const spec = shapeByHitId.get(hitId);
    if (!spec) continue;
    const seedTag = `head-area-density\0${hitId}\0${samplesPerHit}`;
    out[hitId] = sampleDotsInHeadShape(spec, samplesPerHit, seedTag);
  }
  return out;
}
