import {
  sampleDotsInMergedBodyPartPaths,
  type BodySubpath,
} from "@/components/landing/bodyMapSampleDots";

/**
 * Standard heatmap-style sequential ramp: blue → green → yellow → orange → red
 * (low → high on the sqrt-scaled count domain).
 */
const COUNT_COLOR_STOPS = [
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

const COUNT_RGB_STOPS: Rgb[] = COUNT_COLOR_STOPS.map((h) => hexToRgb(h));

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
