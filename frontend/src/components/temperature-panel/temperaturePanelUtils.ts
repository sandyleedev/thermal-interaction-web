/** Global °C domain for the temperature filter panel. */
export const TEMP_AXIS_MIN = -10;
export const TEMP_AXIS_MAX = 100;

/** Clamp temperature to the global domain. */
export function clampTemp(c: number): number {
  return Math.min(TEMP_AXIS_MAX, Math.max(TEMP_AXIS_MIN, c));
}

/** Map °C to x (0 = left = cold/min, width = right = hot/max). */
export function tempToX(
  tempC: number,
  width: number,
  minC = TEMP_AXIS_MIN,
  maxC = TEMP_AXIS_MAX,
): number {
  const t = clampTemp(tempC);
  return ((t - minC) / (maxC - minC)) * width;
}

/** Normalized position in [0, 1] along the axis (min → max). */
export function tempToNorm(
  tempC: number,
  minC = TEMP_AXIS_MIN,
  maxC = TEMP_AXIS_MAX,
): number {
  const t = clampTemp(tempC);
  return (t - minC) / (maxC - minC);
}
