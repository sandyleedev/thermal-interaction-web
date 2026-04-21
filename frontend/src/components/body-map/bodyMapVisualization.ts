import {
  sampleDotsInMergedBodyPartPaths,
  type BodySubpath,
} from "./bodyMapSampleDots";

/**
 * Standard heatmap-style sequential ramp: blue → green → yellow → orange → red
 * (low → high on the sqrt-scaled count domain).
 */
export const HEATMAP_COUNT_COLOR_STOPS = [
  "#313695",
  "#4575b4",
  "#74add1",
  "#abd9e9",
  "#abdda4",
  "#a6d96a",
  "#d9ef8b",
  "#fee08b",
  "#fdae61",
  "#f46d43",
  "#d73027",
  "#a50026",
] as const;

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (x: number) => Math.min(255, Math.max(0, x));
  return `#${[r, g, b]
    .map((x) => clamp(x).toString(16).padStart(2, "0"))
    .join("")}`;
}

const COUNT_RGB_STOPS: Rgb[] = HEATMAP_COUNT_COLOR_STOPS.map((h) => hexToRgb(h));

/** Piecewise linear RGB ramp (replaces d3 scaleSequential + interpolateRgbBasis). */
function interpolateHeatmapColor(t: number): string {
  const u = Math.min(1, Math.max(0, t));
  const n = COUNT_RGB_STOPS.length;
  if (n === 0) return "#000000";
  if (n === 1) return rgbToHex(COUNT_RGB_STOPS[0]);
  const max = n - 1;
  const pos = u * max;
  const i = Math.min(Math.floor(pos), max - 1);
  const f = pos - i;
  return rgbToHex(lerpRgb(COUNT_RGB_STOPS[i], COUNT_RGB_STOPS[i + 1], f));
}

function sqrtCount(n: number): number {
  return Math.sqrt(Math.max(0, n));
}

/**
 * 0–1 position for opacity / emphasis; compresses large-count gaps (e.g. 210 vs 223).
 * Still derived only from raw counts — not area or density.
 */
export function countToPerceptualNormalized(
  paperCount: number,
  domain: [number, number],
): number {
  const [d0, d1] = domain;
  const s = sqrtCount(paperCount);
  const s0 = sqrtCount(d0);
  const s1 = sqrtCount(d1);
  if (s1 <= s0) return 0.5;
  return Math.min(1, Math.max(0, (s - s0) / (s1 - s0)));
}

/**
 * Map raw paper count to fill color. Uses a sqrt transform on the ramp so similar
 * counts stay visually similar; tooltip still shows raw count.
 */
export function mapCountToColor(
  paperCount: number,
  domain: [number, number],
): string {
  const [d0, d1] = domain;
  const s0 = sqrtCount(d0);
  const s1 = sqrtCount(d1);
  const sv = sqrtCount(paperCount);
  const t = s1 <= s0 ? 0.5 : (sv - s0) / (s1 - s0);
  return interpolateHeatmapColor(Math.min(1, Math.max(0, t)));
}

const HEATMAP_LEGEND_BUCKET_COUNT = 4;

/** Canonical order for merged body-map regions (matches BodyMap BODY_PARTS ids). */
export const BODY_MAP_REGION_IDS = [
  "head",
  "torso",
  "arms",
  "legs",
  "hands",
  "feet",
] as const;

export type HeatmapColorLegendItem = {
  /** Fill at the midpoint of this paper-count band (same ramp as the map). */
  color: string;
  /** Paper-count range label */
  rangeLabel: string;
};

/** Same limb merge rules as the body map silhouette (arms/legs/hands/feet keys). */
export function getRegionCountForBodyMapPart(
  partId: string,
  raw: Record<string, number>,
): number {
  switch (partId) {
    case "arms":
      return raw.arms ?? (raw.leftArm ?? 0) + (raw.rightArm ?? 0);
    case "legs":
      return raw.legs ?? (raw.leftLeg ?? 0) + (raw.rightLeg ?? 0);
    case "hands":
      return raw.hands ?? (raw.leftHand ?? 0) + (raw.rightHand ?? 0);
    case "feet":
      return raw.feet ?? (raw.leftFoot ?? 0) + (raw.rightFoot ?? 0);
    default:
      return raw[partId] ?? 0;
  }
}

function quantileSorted(sortedAsc: readonly number[], q: number): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  if (n === 1) return sortedAsc[0];
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const f = pos - lo;
  return sortedAsc[lo] * (1 - f) + sortedAsc[hi] * f;
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function formatClosedRange(lo: number, hi: number): string {
  const a = Math.max(0, Math.round(lo));
  const b = Math.round(hi);
  if (a >= b) return a.toLocaleString();
  return `${a.toLocaleString()}–${b.toLocaleString()}`;
}

/** Empty range, or a single integer (awkward standalone “13” label). */
function isNarrowBin(b: { lo: number; hi: number }): boolean {
  if (b.lo > b.hi) return true;
  return b.hi === b.lo;
}

type LegendBin = { lo: number; hi: number };

/**
 * Quantile edges → four contiguous candidate bins on [0, maxVal].
 * May include empty or single-value bins; {@link postProcessLegendBins} fixes that.
 */
function quantileEdgesToBins(
  e1: number,
  e2: number,
  e3: number,
  maxVal: number,
): LegendBin[] {
  return [
    { lo: 0, hi: e1 },
    { lo: e1 + 1, hi: e2 },
    { lo: e2 + 1, hi: e3 },
    { lo: e3 + 1, hi: maxVal },
  ];
}

function mergeNarrowBinsOnce(stack: LegendBin[]): LegendBin[] {
  const next: LegendBin[] = [];
  let i = 0;
  while (i < stack.length) {
    const cur = stack[i];
    if (!isNarrowBin(cur)) {
      next.push(cur);
      i += 1;
      continue;
    }
    if (i + 1 < stack.length) {
      next.push({ lo: cur.lo, hi: stack[i + 1].hi });
      i += 2;
      continue;
    }
    if (next.length > 0) {
      const prev = next.pop()!;
      next.push({ lo: prev.lo, hi: Math.max(prev.hi, cur.hi) });
      i += 1;
      continue;
    }
    next.push(cur);
    i += 1;
  }
  return next;
}

/**
 * Merge narrow / empty bins (prefer merging forward). Repeat until stable.
 * May yield fewer than four bins (clearer labels).
 */
function postProcessLegendBins(bins: LegendBin[]): LegendBin[] {
  let stack = [...bins];
  let guard = 0;
  while (guard++ < 12) {
    if (!stack.some(isNarrowBin)) break;
    const merged = mergeNarrowBinsOnce(stack);
    const unchanged =
      merged.length === stack.length &&
      merged.every(
        (b, j) =>
          stack[j] !== undefined && b.lo === stack[j].lo && b.hi === stack[j].hi,
      );
    if (unchanged) break;
    stack = merged;
  }

  const valid = stack.filter((b) => b.lo <= b.hi);
  return valid.length > 0 ? valid : [{ lo: 0, hi: 0 }];
}

function binsToLegendItems(
  bins: LegendBin[],
  colorDomain: [number, number],
): HeatmapColorLegendItem[] {
  const mid = (a: number, b: number) => (a + b) / 2;
  return bins.map((b) => ({
    color: mapCountToColor(mid(b.lo, b.hi), colorDomain),
    rangeLabel: formatClosedRange(b.lo, b.hi),
  }));
}

export type GlobalHeatmapScale = {
  /** Fixed domain [0, globalMax] for sqrt colour mapping (full dataset). */
  colorDomain: [number, number];
  legendItems: HeatmapColorLegendItem[];
};

/**
 * Builds a stable heatmap legend and colour domain from **full-dataset** region counts only.
 * Quantile splits on the six regional totals; falls back to uniform bins if thresholds collapse.
 * Filtered counts are mapped later with {@link mapCountToColor}(count, colorDomain).
 */
function resolveQuantileEdges(
  sortedAsc: readonly number[],
  maxVal: number,
): [number, number, number] {
  let e1 = clampInt(Math.round(quantileSorted(sortedAsc, 0.25)), 0, maxVal);
  let e2 = clampInt(Math.round(quantileSorted(sortedAsc, 0.5)), 0, maxVal);
  let e3 = clampInt(Math.round(quantileSorted(sortedAsc, 0.75)), 0, maxVal);

  const quantilesOk = e1 < e2 && e2 < e3 && e3 <= maxVal;
  if (!quantilesOk) {
    const step = Math.max(1, Math.ceil(maxVal / HEATMAP_LEGEND_BUCKET_COUNT));
    e1 = Math.min(step, maxVal);
    e2 = Math.min(2 * step, maxVal);
    e3 = Math.min(3 * step, maxVal);
  }

  if (e2 <= e1) e2 = Math.min(e1 + 1, maxVal);
  if (e3 <= e2) e3 = Math.min(e2 + 1, maxVal);

  if (!(e1 < e2 && e2 < e3)) {
    if (maxVal <= 1) {
      return [0, 0, maxVal];
    }
    const step = Math.max(1, Math.ceil(maxVal / HEATMAP_LEGEND_BUCKET_COUNT));
    return [
      Math.min(step, maxVal),
      Math.min(2 * step, maxVal),
      Math.min(3 * step, maxVal),
    ];
  }

  return [e1, e2, e3];
}

export function buildGlobalHeatmapScaleFromFullDatasetCounts(
  rawGlobal: Record<string, number>,
): GlobalHeatmapScale {
  const counts = BODY_MAP_REGION_IDS.map((id) =>
    getRegionCountForBodyMapPart(id, rawGlobal),
  );
  const maxVal = Math.max(0, ...counts);
  const colorDomain: [number, number] =
    maxVal <= 0 ? ([0, 1] as [number, number]) : ([0, maxVal] as [number, number]);

  if (maxVal <= 0) {
    const zeroColor = mapCountToColor(0, colorDomain);
    return {
      colorDomain,
      legendItems: Array.from({ length: HEATMAP_LEGEND_BUCKET_COUNT }, () => ({
        color: zeroColor,
        rangeLabel: "0",
      })),
    };
  }

  const sorted = [...counts].sort((a, b) => a - b);
  const [e1, e2, e3] = resolveQuantileEdges(sorted, maxVal);
  const rawBins = quantileEdgesToBins(e1, e2, e3, maxVal);
  const cleanedBins = postProcessLegendBins(rawBins);
  const legendItems = binsToLegendItems(cleanedBins, colorDomain);

  return {
    colorDomain,
    legendItems,
  };
}

/** Cap per region so very large counts stay performant (tweak for production data). */
const RAW_DOTS_MAX_PER_REGION = 500;

type GenerateDotsForRegionOptions = {
  maxDots?: number;
};

/**
 * Place dots inside merged region paths (silhouette-clipped sampling).
 * One dot per paper up to `maxDots`.
 */
export function generateDotsForRegion(
  subpaths: BodySubpath[],
  paperCount: number,
  options?: GenerateDotsForRegionOptions,
): { x: number; y: number }[] {
  const maxDots = options?.maxDots ?? RAW_DOTS_MAX_PER_REGION;
  const n = Math.min(Math.max(0, Math.floor(paperCount)), maxDots);
  if (n === 0) return [];
  return sampleDotsInMergedBodyPartPaths(subpaths, n);
}
