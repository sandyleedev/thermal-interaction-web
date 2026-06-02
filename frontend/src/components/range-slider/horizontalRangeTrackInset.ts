/**
 * Slider thumbs are centered with `translateX(-50%)`.
 * We keep an inset on both ends so thumb centers do not sit on the exact track edges.
 * This makes edge dragging feel more natural while keeping end overflow small.
 */
export const HORIZONTAL_RANGE_THUMB_INSET_PX = 8;
export const HORIZONTAL_RANGE_THUMB_WIDTH_PX =
  HORIZONTAL_RANGE_THUMB_INSET_PX * 2;

/** Converts a mouse/touch X position (clientX) into a normalized slider value between 0 and 1 */
export function clientXToInsetNorm(
  clientX: number,
  rect: DOMRect,
  insetPx: number = HORIZONTAL_RANGE_THUMB_INSET_PX,
): number {
  const w = rect.width - 2 * insetPx;
  if (w <= 0) return 0.5;
  return Math.min(1, Math.max(0, (clientX - rect.left - insetPx) / w));
}
