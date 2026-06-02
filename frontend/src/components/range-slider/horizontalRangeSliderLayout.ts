import { clientXToInsetNorm } from "@/components/range-slider/horizontalRangeTrackInset";

/** Keep a number inside the 0..1 range. */
export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Pointer X → normalized track position (0..1). */
export function normFromClientX(
  clientX: number,
  rect: DOMRect,
  insetPx = 0,
): number {
  return clientXToInsetNorm(clientX, rect, insetPx);
}

/** Normalized position (0..1) → CSS `left` for handles and ticks. */
export function sliderLeftForNorm(norm: number, insetPx = 0): string {
  const n = clamp01(norm);
  const w = insetPx * 2;
  return `calc(${insetPx}px + (100% - ${w}px) * ${n})`;
}

/** Selected range → CSS `left` / `width` for highlight and dim regions. */
export function sliderRangeStyle(
  rangeLeft: number,
  rangeWidth: number,
  insetPx = 0,
): { left: string; width: string } {
  const w = insetPx * 2;
  return {
    left: `calc(${insetPx}px + (100% - ${w}px) * ${clamp01(rangeLeft)})`,
    width: `calc((100% - ${w}px) * ${clamp01(rangeWidth)})`,
  };
}

/** CSS `left` for the right edge of the selected range. */
export function sliderRightEdge(
  rangeLeft: number,
  rangeWidth: number,
  insetPx = 0,
): string {
  const w = insetPx * 2;
  return `calc(${insetPx}px + (100% - ${w}px) * ${clamp01(rangeLeft + rangeWidth)})`;
}
