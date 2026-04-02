/** Global °C domain for the temperature filter panel. */
export const TEMP_AXIS_MIN = -10;
export const TEMP_AXIS_MAX = 100;

export function clampTemp(c: number): number {
  return Math.min(TEMP_AXIS_MAX, Math.max(TEMP_AXIS_MIN, c));
}

/** Map °C to SVG y (0 = top = hot, height = bottom = cold). */
export function tempToY(
  tempC: number,
  height: number,
  minC = TEMP_AXIS_MIN,
  maxC = TEMP_AXIS_MAX,
): number {
  const t = clampTemp(tempC);
  return ((maxC - t) / (maxC - minC)) * height;
}

/** Map client Y inside track rect to °C (top of rect = maxC). */
export function clientYToTemp(
  clientY: number,
  rect: DOMRect,
  minC = TEMP_AXIS_MIN,
  maxC = TEMP_AXIS_MAX,
): number {
  const ratio = (clientY - rect.top) / rect.height;
  const t = maxC - ratio * (maxC - minC);
  return clampTemp(t);
}

/** Cold (blue) → warm (red) for scatter / line accents. */
export function tempToCoolWarmColor(tempC: number): string {
  const u = Math.min(
    1,
    Math.max(0, (tempC - TEMP_AXIS_MIN) / (TEMP_AXIS_MAX - TEMP_AXIS_MIN)),
  );
  const r = Math.round(40 + u * 200);
  const g = Math.round(90 + u * 100);
  const b = Math.round(200 - u * 195);
  return `rgb(${r},${g},${b})`;
}

export function rangeOverlapsFilter(
  minC: number,
  maxC: number,
  filterLow: number,
  filterHigh: number,
): boolean {
  return maxC >= filterLow && minC <= filterHigh;
}
