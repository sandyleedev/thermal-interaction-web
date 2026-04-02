/**
 * Horizontal range thumbs use width 20px and translateX(-50%). Inset the draggable
 * axis by half the thumb width so centers at 0% / 100% stay inside the track pill.
 */
export const HORIZONTAL_RANGE_THUMB_INSET_PX = 10;
export const HORIZONTAL_RANGE_THUMB_WIDTH_PX =
  HORIZONTAL_RANGE_THUMB_INSET_PX * 2;

/** Map pointer X to [0, 1] along the inset segment (matches thumb center positions). */
export function clientXToInsetNorm(
  clientX: number,
  rect: DOMRect,
  insetPx: number = HORIZONTAL_RANGE_THUMB_INSET_PX,
): number {
  const w = rect.width - 2 * insetPx;
  if (w <= 0) return 0.5;
  return Math.min(1, Math.max(0, (clientX - rect.left - insetPx) / w));
}

/** CSS `left` for thumb center: `translateX(-50%)` is applied on the handle. */
export function thumbCenterLeftCalc(n: number): string {
  const i = HORIZONTAL_RANGE_THUMB_INSET_PX;
  const w = HORIZONTAL_RANGE_THUMB_WIDTH_PX;
  return `calc(${i}px + (100% - ${w}px) * ${n})`;
}

/** Inset-aware span under the track (dim / selection), same basis as thumbs. */
export function insetRangeLayerStyle(rangeLeft: number, rangeWidth: number): {
  left: string;
  width: string;
} {
  const i = HORIZONTAL_RANGE_THUMB_INSET_PX;
  const w = HORIZONTAL_RANGE_THUMB_WIDTH_PX;
  return {
    left: `calc(${i}px + (100% - ${w}px) * ${rangeLeft})`,
    width: `calc((100% - ${w}px) * ${rangeWidth})`,
  };
}

export function insetDimLeftWidth(rangeLeft: number): { width: string } {
  const i = HORIZONTAL_RANGE_THUMB_INSET_PX;
  const w = HORIZONTAL_RANGE_THUMB_WIDTH_PX;
  return {
    width: `calc(${i}px + (100% - ${w}px) * ${rangeLeft})`,
  };
}

/** Left edge of the right dim segment; pair with `right: 0` in CSS. */
export function insetDimRightLeftEdge(
  rangeLeft: number,
  rangeWidth: number,
): string {
  const i = HORIZONTAL_RANGE_THUMB_INSET_PX;
  const w = HORIZONTAL_RANGE_THUMB_WIDTH_PX;
  return `calc(${i}px + (100% - ${w}px) * ${rangeLeft + rangeWidth})`;
}
