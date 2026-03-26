import { BODY_MAP_OUTLINE_PATH_D, BODY_MAP_VIEW } from "@/components/landing/bodyMapOutlinePath";
const INNER_TX = -59.365521;

function hashStringToSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Deterministic PRNG in [0, 1) so dot clouds stay stable across refresh. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Circles are siblings of the path under `g`; map path-local sample to parent `g` space. */
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

function pointInsideSilhouette(
  silhouette: SVGPathElement,
  path: SVGPathElement,
  pl: SVGPoint,
  svg: SVGSVGElement,
): boolean {
  const ctmPath = path.getCTM();
  const ctmSil = silhouette.getCTM();
  if (!ctmPath || !ctmSil) return true;
  const pVp = pl.matrixTransform(ctmPath);
  const pSil = pVp.matrixTransform(ctmSil.inverse());
  const test = svg.createSVGPoint();
  test.x = pSil.x;
  test.y = pSil.y;
  return silhouette.isPointInFill(test);
}

function runWithBodyPartPathInTempSvg<T>(
  pathD: string,
  pathTransform: string | undefined,
  fn: (ctx: {
    path: SVGPathElement;
    silhouette: SVGPathElement;
    svg: SVGSVGElement;
  }) => T,
): T | null {
  if (typeof document === "undefined") return null;

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute(
    "viewBox",
    `${BODY_MAP_VIEW.x} ${BODY_MAP_VIEW.y} ${BODY_MAP_VIEW.w} ${BODY_MAP_VIEW.h}`,
  );

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `translate(${INNER_TX})`);

  const silhouette = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  silhouette.setAttribute("d", BODY_MAP_OUTLINE_PATH_D);
  silhouette.setAttribute("fill", "#000");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  if (pathTransform) path.setAttribute("transform", pathTransform);

  g.appendChild(silhouette);
  g.appendChild(path);
  svg.appendChild(g);
  wrapper.appendChild(svg);
  document.body.appendChild(wrapper);

  try {
    return fn({ path, silhouette, svg });
  } finally {
    document.body.removeChild(wrapper);
  }
}

/** Axis-aligned bbox area of the part path (proxy for region size; same coords as BodyMap). */
export function getBodyPartPathBBoxArea(
  pathD: string,
  pathTransform: string | undefined,
): number {
  const r = runWithBodyPartPathInTempSvg(pathD, pathTransform, ({ path }) => {
    const b = path.getBBox();
    return Math.max(b.width * b.height, 1e-9);
  });
  return r ?? 1;
}

/**
 * Rejection sample inside part path and body silhouette; output coords match BodyMap `<circle cx cy>` (parent `g` space).
 */
export function sampleDotsInBodyPartPath(
  pathD: string,
  pathTransform: string | undefined,
  dotCount: number,
): { x: number; y: number }[] {
  if (dotCount <= 0) return [];

  const sampled = runWithBodyPartPathInTempSvg(
    pathD,
    pathTransform,
    ({ path, silhouette, svg }) => {
      const bbox = path.getBBox();
      const out: { x: number; y: number }[] = [];
      const pt = svg.createSVGPoint();
      /** Thin / rotated limbs: fill is a small fraction of bbox; raise limits. */
      let attemptLimit = Math.min(
        600_000,
        Math.max(dotCount * 900, 20_000),
      );
      const attemptCap = 1_200_000;
      let attempts = 0;
      const seed = hashStringToSeed(
        `${pathD}\0${pathTransform ?? ""}\0${dotCount}`,
      );
      const rnd = mulberry32(seed === 0 ? 0x9e3779b9 : seed);

      while (out.length < dotCount) {
        while (out.length < dotCount && attempts < attemptLimit) {
          attempts += 1;
          const x = bbox.x + rnd() * bbox.width;
          const y = bbox.y + rnd() * bbox.height;
          pt.x = x;
          pt.y = y;
          if (!path.isPointInFill(pt)) continue;
          if (!pointInsideSilhouette(silhouette, path, pt, svg)) continue;
          out.push(localPointToParentGroup(path, pt));
        }
        if (out.length >= dotCount || attemptLimit >= attemptCap) {
          break;
        }
        attemptLimit = Math.min(attemptLimit * 2, attemptCap);
      }
      return out;
    },
  );

  return sampled ?? [];
}

export type BodySubpath = { d: string; transform?: string };

/** Sum of bbox areas for disjoint subpaths (combined region size proxy). */
export function getMergedBodyPartBBoxArea(
  subpaths: readonly BodySubpath[],
): number {
  if (subpaths.length === 0) return 1e-9;
  let sum = 0;
  for (const sp of subpaths) {
    sum += getBodyPartPathBBoxArea(sp.d, sp.transform);
  }
  return Math.max(sum, 1e-9);
}

/**
 * Split dot budget across subpaths by bbox area, then sample each (stable, deterministic).
 */
export function sampleDotsInMergedBodyPartPaths(
  subpaths: readonly BodySubpath[],
  dotCount: number,
): { x: number; y: number }[] {
  if (dotCount <= 0 || subpaths.length === 0) return [];
  if (subpaths.length === 1) {
    return sampleDotsInBodyPartPath(
      subpaths[0].d,
      subpaths[0].transform,
      dotCount,
    );
  }
  const areas = subpaths.map((sp) =>
    getBodyPartPathBBoxArea(sp.d, sp.transform),
  );
  const totalArea = areas.reduce((a, b) => a + b, 0);
  const out: { x: number; y: number }[] = [];
  let allocated = 0;
  for (let i = 0; i < subpaths.length; i++) {
    let n: number;
    if (i === subpaths.length - 1) {
      n = Math.max(0, dotCount - allocated);
    } else if (totalArea <= 0) {
      n = Math.round(dotCount / subpaths.length);
    } else {
      n = Math.round((dotCount * areas[i]) / totalArea);
    }
    allocated += n;
    out.push(
      ...sampleDotsInBodyPartPath(subpaths[i].d, subpaths[i].transform, n),
    );
  }
  return out;
}

/**
 * How much total paper count vs papers-per-area drives dot opacity / count.
 * Pure density favors small regions (e.g. head); a strong count term keeps
 * high-volume parts (e.g. torso) visually dominant.
 */
export const BODY_MAP_COUNT_VISUAL_WEIGHT = 0.62;
export const BODY_MAP_DENSITY_VISUAL_WEIGHT = 0.38;

/**
 * Dot budget from a precomputed blend share (0..1 after dividing by max blend across parts).
 */
export function paperCountToDotCountFromBlendShare(
  paperCount: number,
  blendForPart: number,
  maxBlendAcrossParts: number,
): number {
  if (paperCount <= 0) return 0;
  const maxB = Math.max(maxBlendAcrossParts, 1e-12);
  const share = Math.min(1, blendForPart / maxB);
  return Math.min(
    300,
    Math.max(8, Math.round(share * 248 + 4.2 * Math.sqrt(paperCount))),
  );
}
