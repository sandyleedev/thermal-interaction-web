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
