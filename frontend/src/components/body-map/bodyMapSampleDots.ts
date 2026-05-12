import { BODY_MAP_OUTLINE_PATH_D, BODY_MAP_VIEW } from "./bodyMapOutlinePath";
import {
  bodyMapPlacementRegionsForDetail,
  normalizeBodySites,
  resolveBodySite,
  type BodyMapPlacementRegion,
  type BodySite,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import { dotCohortPlanForResolvedSite } from "./bodyMapDotCohorts";
const INNER_TX = 0;

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

export type BodySubpath = { d: string; transform?: string; label?: string };

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

type TwoPathCtx = {
  path0: SVGPathElement;
  path1: SVGPathElement;
  silhouette: SVGPathElement;
  svg: SVGSVGElement;
};

function runWithTwoBodyPartPathsInTempSvg<T>(
  sp0: BodySubpath,
  sp1: BodySubpath,
  fn: (ctx: TwoPathCtx) => T,
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

  const path0 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path0.setAttribute("d", sp0.d);
  if (sp0.transform) path0.setAttribute("transform", sp0.transform);

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute("d", sp1.d);
  if (sp1.transform) path1.setAttribute("transform", sp1.transform);

  g.appendChild(silhouette);
  g.appendChild(path0);
  g.appendChild(path1);
  svg.appendChild(g);
  wrapper.appendChild(svg);
  document.body.appendChild(wrapper);

  try {
    return fn({ path0, path1, silhouette, svg });
  } finally {
    document.body.removeChild(wrapper);
  }
}

function runWithCohortPathsInTempSvg<T>(
  subpaths: readonly BodySubpath[],
  indices: readonly number[],
  fn: (ctx: {
    paths: SVGPathElement[];
    silhouette: SVGPathElement;
    svg: SVGSVGElement;
  }) => T,
): T | null {
  if (typeof document === "undefined" || indices.length === 0) return null;

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

  const paths: SVGPathElement[] = [];
  for (const idx of indices) {
    const sp = subpaths[idx];
    if (!sp) continue;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", sp.d);
    if (sp.transform) p.setAttribute("transform", sp.transform);
    g.appendChild(p);
    paths.push(p);
  }

  if (paths.length === 0) {
    return null;
  }

  g.insertBefore(silhouette, g.firstChild);
  svg.appendChild(g);
  wrapper.appendChild(svg);
  document.body.appendChild(wrapper);

  try {
    return fn({ paths, silhouette, svg });
  } finally {
    document.body.removeChild(wrapper);
  }
}

function trySamplePathAtVerticalFraction(
  path: SVGPathElement,
  silhouette: SVGPathElement,
  svg: SVGSVGElement,
  t: number,
  rnd: () => number,
): { x: number; y: number } | null {
  const bbox = path.getBBox();
  const pt = svg.createSVGPoint();
  const u = Math.min(1, Math.max(0, t));
  const yTarget = bbox.y + u * bbox.height;
  const jitter = Math.max(bbox.height * 0.1, 3);
  for (let k = 0; k < 140; k++) {
    const x = bbox.x + rnd() * bbox.width;
    const y = yTarget + (rnd() - 0.5) * 2 * jitter;
    pt.x = x;
    pt.y = y;
    if (!path.isPointInFill(pt)) continue;
    if (!pointInsideSilhouette(silhouette, path, pt, svg)) continue;
    return localPointToParentGroup(path, pt);
  }
  return null;
}

/** Axis-aligned bbox area of the part path (proxy for region size; same coords as BodyMap). */
function getBodyPartPathBBoxArea(
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
function sampleDotsInBodyPartPath(
  pathD: string,
  pathTransform: string | undefined,
  dotCount: number,
  seedTag?: string,
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
        seedTag !== undefined
          ? `${pathD}\0${pathTransform ?? ""}\0${seedTag}`
          : `${pathD}\0${pathTransform ?? ""}\0${dotCount}`,
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

/**
 * One dot inside the union of one or more subpaths (e.g. full left arm = upper + fore + shell).
 */
function sampleOneDotInCohortUnion(
  subpaths: readonly BodySubpath[],
  indices: readonly number[],
  seedTag: string,
): { x: number; y: number }[] {
  if (indices.length === 0) return [];
  if (indices.length === 1) {
    const sp = subpaths[indices[0]!]!;
    return sampleDotsInBodyPartPath(sp.d, sp.transform, 1, seedTag);
  }

  const sampled = runWithCohortPathsInTempSvg(
    subpaths,
    indices,
    ({ paths, silhouette, svg }) => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const path of paths) {
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
      const seed = hashStringToSeed(seedTag);
      const rnd = mulberry32(seed === 0 ? 0x9e3779b9 : seed);
      const maxAttempts = 120_000;
      for (let attempts = 0; attempts < maxAttempts; attempts++) {
        const x = minX + rnd() * (maxX - minX);
        const y = minY + rnd() * (maxY - minY);
        pt.x = x;
        pt.y = y;
        let hit: SVGPathElement | null = null;
        for (const path of paths) {
          if (path.isPointInFill(pt)) {
            hit = path;
            break;
          }
        }
        if (!hit) continue;
        if (!pointInsideSilhouette(silhouette, hit, pt, svg)) continue;
        return [localPointToParentGroup(hit, pt)];
      }

      /** Bbox-center fallback (may land outside thin strokes). */
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      pt.x = cx;
      pt.y = cy;
      for (const path of paths) {
        if (path.isPointInFill(pt)) {
          return [localPointToParentGroup(path, pt)];
        }
      }
      return [];
    },
  );

  return sampled ?? [];
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
  if (subpaths.length > 2) {
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
  const areas = subpaths.map((sp) =>
    getBodyPartPathBBoxArea(sp.d, sp.transform),
  );
  const totalArea = areas.reduce((a, b) => a + b, 0);
  let n0: number;
  let n1: number;
  if (totalArea <= 0) {
    n0 = Math.round(dotCount / subpaths.length);
    n1 = dotCount - n0;
  } else {
    n0 = Math.round((dotCount * areas[0]) / totalArea);
    n1 = dotCount - n0;
  }
  return [
    ...sampleDotsInBodyPartPath(subpaths[0].d, subpaths[0].transform, n0),
    ...sampleDotsInBodyPartPath(subpaths[1].d, subpaths[1].transform, n1),
  ];
}

export const MAX_HEATMAP_DOTS_PER_REGION = 500;

export function getBodySubpathBBoxCenter(
  sp: BodySubpath,
): { cx: number; cy: number } | null {
  const r = runWithBodyPartPathInTempSvg(sp.d, sp.transform, ({ path }) => {
    const b = path.getBBox();
    return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
  });
  return r ?? null;
}

export type HeatmapDotPlacementTarget = {
  paperId: string;
  subpathIndex?: number;
  pairKey?: string;
  /** Union of these silhouette subpath indices (L1 general / fine cohort placement). */
  cohortSubpathIndices?: readonly number[];
};

/** Which merged silhouette path(s) on the L1 map should show a dot for this raw site. */
function placementRegionsForBodySite(
  site: BodySite,
): readonly BodyMapPlacementRegion[] {
  return bodyMapPlacementRegionsForDetail(resolveBodySite(site));
}

function leftRightIndicesFromSubpaths(
  subpaths: readonly BodySubpath[],
): { leftIdx: number; rightIdx: number } {
  if (subpaths.length !== 2) return { leftIdx: 0, rightIdx: 1 };
  const a = getBodySubpathBBoxCenter(subpaths[0]);
  const b = getBodySubpathBBoxCenter(subpaths[1]);
  if (!a || !b) return { leftIdx: 1, rightIdx: 0 };
  /** Front figure: anatomical left is the viewer's right → larger SVG x. */
  return a.cx < b.cx
    ? { rightIdx: 0, leftIdx: 1 }
    : { rightIdx: 1, leftIdx: 0 };
}

/**
 * One dot per matching body site on this coarse map part; bilateral unspecified → L+R.
 * Placement uses Inkscape path labels: L1 **general** → union of all left vs right subpaths
 * (e.g. full arm); fine L2 (e.g. forearm) → left/right forearm paths only. Whole-body general
 * is excluded upstream (no silhouette dots).
 */
export function collectHeatmapDotPlacementTargetsForCoarsePart(
  partId: BodyMapPlacementRegion,
  papers: readonly ResearchPaper[],
  subpaths: readonly BodySubpath[],
): HeatmapDotPlacementTarget[] {
  const lr = leftRightIndicesFromSubpaths(subpaths);
  const subpathCount = subpaths.length;
  const labels = subpaths.map((sp) => sp.label ?? "");
  const out: HeatmapDotPlacementTarget[] = [];

  for (const paper of papers) {
    const sites = normalizeBodySites(paper);
    for (let si = 0; si < sites.length; si++) {
      const site = sites[si];
      if (!placementRegionsForBodySite(site).includes(partId)) continue;

      const resolved = resolveBodySite(site);
      const plan = dotCohortPlanForResolvedSite(partId, labels, resolved);

      if (plan) {
        const pairKey = `${paper.id}:${partId}:site${si}`;
        if (plan.kind === "single") {
          const idx = plan.indices.length > 0 ? plan.indices : [0];
          out.push({
            paperId: paper.id,
            cohortSubpathIndices: idx,
          });
          continue;
        }
        if (site.side === "left") {
          out.push({ paperId: paper.id, cohortSubpathIndices: [...plan.left] });
        } else if (site.side === "right") {
          out.push({ paperId: paper.id, cohortSubpathIndices: [...plan.right] });
        } else {
          out.push(
            { paperId: paper.id, cohortSubpathIndices: [...plan.left], pairKey },
            { paperId: paper.id, cohortSubpathIndices: [...plan.right], pairKey },
          );
        }
        continue;
      }

      if (subpathCount <= 1) {
        out.push({ paperId: paper.id });
        continue;
      }
      const legacyPairKey = `${paper.id}:${partId}:site${si}`;
      if (site.side === "left") {
        out.push({ paperId: paper.id, subpathIndex: lr.leftIdx });
      } else if (site.side === "right") {
        out.push({ paperId: paper.id, subpathIndex: lr.rightIdx });
      } else {
        out.push(
          { paperId: paper.id, subpathIndex: lr.leftIdx, pairKey: legacyPairKey },
          { paperId: paper.id, subpathIndex: lr.rightIdx, pairKey: legacyPairKey },
        );
      }
    }
  }
  return out;
}

/**
 * Deterministic coordinates for Dot view: one sample per placement target; bilateral pairs share vertical `t`.
 */
export function sampleHeatmapDotPlacements(
  subpaths: readonly BodySubpath[],
  targets: readonly HeatmapDotPlacementTarget[],
  partId: string,
  maxDots = MAX_HEATMAP_DOTS_PER_REGION,
): { x: number; y: number }[] {
  const capped = targets.slice(0, maxDots);
  const singles: HeatmapDotPlacementTarget[] = [];
  const pairGroups = new Map<string, HeatmapDotPlacementTarget[]>();
  for (const t of capped) {
    if (t.pairKey) {
      const arr = pairGroups.get(t.pairKey) ?? [];
      arr.push(t);
      pairGroups.set(t.pairKey, arr);
    } else {
      singles.push(t);
    }
  }
  const out: { x: number; y: number }[] = [];
  for (const [pk, group] of pairGroups) {
    if (group.length === 2) {
      const t0 = group[0]!;
      const t1 = group[1]!;
      const c0 = t0.cohortSubpathIndices;
      const c1 = t1.cohortSubpathIndices;
      if (c0 && c1 && c0.length >= 1 && c1.length >= 1) {
        const seed = hashStringToSeed(`${pk}\0cohort-pair\0${partId}`);
        out.push(
          ...sampleOneDotInCohortUnion(
            subpaths,
            c0,
            `${pk}\0L\0${partId}\0${seed}`,
          ),
          ...sampleOneDotInCohortUnion(
            subpaths,
            c1,
            `${pk}\0R\0${partId}\0${seed}`,
          ),
        );
        continue;
      }
      if (subpaths.length === 2) {
        group.sort((a, b) => (a.subpathIndex ?? 0) - (b.subpathIndex ?? 0));
        const [a0, a1] = group;
        const seed = hashStringToSeed(`${pk}\0paired\0${partId}`);
        const rnd = mulberry32(seed === 0 ? 0x9e3779b9 : seed);
        const sharedT = rnd();
        const batch =
          runWithTwoBodyPartPathsInTempSvg(subpaths[0], subpaths[1], ({ path0, path1, silhouette, svg }) => {
            const pathFor = (idx: number) => (idx === 0 ? path0 : path1);
            const pa = pathFor(a0.subpathIndex!);
            const pb = pathFor(a1.subpathIndex!);
            let a = trySamplePathAtVerticalFraction(pa, silhouette, svg, sharedT, rnd);
            let b = trySamplePathAtVerticalFraction(pb, silhouette, svg, sharedT, rnd);
            if (!a) {
              a = trySamplePathAtVerticalFraction(pa, silhouette, svg, rnd(), rnd);
            }
            if (!b) {
              b = trySamplePathAtVerticalFraction(pb, silhouette, svg, rnd(), rnd);
            }
            const acc: { x: number; y: number }[] = [];
            if (a) acc.push(a);
            if (b) acc.push(b);
            return acc;
          }) ?? [];
        out.push(...batch);
        continue;
      }
      singles.push(t0, t1);
      continue;
    }
    singles.push(...group);
  }
  for (const t of singles) {
    if (t.cohortSubpathIndices && t.cohortSubpathIndices.length > 0) {
      out.push(
        ...sampleOneDotInCohortUnion(
          subpaths,
          t.cohortSubpathIndices,
          `${partId}:${t.paperId}:${t.cohortSubpathIndices.join(",")}`,
        ),
      );
      continue;
    }
    const idx = t.subpathIndex ?? 0;
    const sp = subpaths[idx] ?? subpaths[0];
    const seedTag = `${partId}:${t.paperId}:${idx}`;
    out.push(...sampleDotsInBodyPartPath(sp.d, sp.transform, 1, seedTag));
  }
  return out;
}
