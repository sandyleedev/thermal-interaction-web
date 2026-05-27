/** Pink legend / tint scale: #ffe4e6 → #db2777 */
export function interpolatePinkDensityTone(t: number): string {
  const u = Math.min(1, Math.max(0, t));
  const c0 = { r: 255, g: 228, b: 230 };
  const c1 = { r: 219, g: 39, b: 119 };
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * u);
  return `rgb(${lerp(c0.r, c1.r)}, ${lerp(c0.g, c1.g)}, ${lerp(c0.b, c1.b)})`;
}

/** Emphasize high-density differences for clearer overlap contrast. */
export function heatmapContrastT(t: number): number {
  return Math.pow(Math.min(1, Math.max(0, t)), 0.72);
}

function uniqueSortedPositiveCounts(
  countsByHit: Readonly<Record<string, number>>,
  fillHitIds: readonly string[],
): number[] {
  const positive = fillHitIds
    .map((id) => countsByHit[id] ?? 0)
    .filter((c) => c > 0);
  return [...new Set(positive)].sort((a, b) => a - b);
}

/**
 * 0–1 rank among distinct paper counts on this detail map.
 * Spreads 2 vs 3 apart even when another subregion has a much higher count.
 */
export function detailAreaRankT(
  paperCount: number,
  countsByHit: Readonly<Record<string, number>>,
  fillHitIds: readonly string[],
): number {
  if (paperCount <= 0) return 0;
  const uniqueSorted = uniqueSortedPositiveCounts(countsByHit, fillHitIds);
  const n = uniqueSorted.length;
  if (n <= 1) return 1;
  const rank = uniqueSorted.indexOf(paperCount);
  return rank < 0 ? 0 : rank / (n - 1);
}

/** Pink fill for detail area view from relative rank on this map. */
export function detailAreaPinkForCount(
  paperCount: number,
  countsByHit: Readonly<Record<string, number>>,
  fillHitIds: readonly string[],
): string {
  if (paperCount <= 0) return interpolatePinkDensityTone(0);
  const rankT = detailAreaRankT(paperCount, countsByHit, fillHitIds);
  const t = 0.1 + Math.pow(rankT, 0.75) * 0.9;
  return interpolatePinkDensityTone(t);
}

/** Opacity for one KDE contour band; scales with both shape and relative count rank. */
export function detailAreaContourOpacity(
  contourStrength: number,
  paperCount: number,
  countsByHit: Readonly<Record<string, number>>,
  fillHitIds: readonly string[],
): number {
  const rankT = detailAreaRankT(paperCount, countsByHit, fillHitIds);
  const shape = 0.18 + Math.min(1, Math.max(0, contourStrength)) * 0.82;
  const countScale = 0.22 + rankT * 0.78;
  return shape * countScale;
}
