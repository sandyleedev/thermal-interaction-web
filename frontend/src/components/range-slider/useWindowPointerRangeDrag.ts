import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

type DragHandle = "low" | "high" | null;

/**
 * Window-level pointermove/up listeners for a dual-handle range slider track.
 * Keeps a ref of the live range so drag updates stay smooth between React commits.
 */
export function useWindowPointerRangeDrag({
  trackRef,
  filterLow,
  filterHigh,
  onSetRange,
  valueFromPointer,
  nextLow,
  nextHigh,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  filterLow: number;
  filterHigh: number;
  onSetRange: (low: number, high: number) => void;
  valueFromPointer: (clientX: number, trackRect: DOMRect) => number;
  nextLow: (value: number, currentHigh: number) => number;
  nextHigh: (currentLow: number, value: number) => number;
}) {
  const rangeRef = useRef({ low: filterLow, high: filterHigh });
  const dragRef = useRef<DragHandle>(null);
  const pointerCaptureRef = useRef<{
    el: HTMLElement;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    rangeRef.current = { low: filterLow, high: filterHigh };
  }, [filterLow, filterHigh]);

  const moveDrag = useCallback(
    (e: PointerEvent) => {
      const el = trackRef.current;
      if (!el || !dragRef.current) return;
      const rect = el.getBoundingClientRect();
      const value = valueFromPointer(e.clientX, rect);
      const { low, high } = rangeRef.current;
      if (dragRef.current === "low") {
        const nextLowValue = nextLow(value, high);
        rangeRef.current = { low: nextLowValue, high };
        onSetRange(nextLowValue, high);
      } else {
        const nextHighValue = nextHigh(low, value);
        rangeRef.current = { low, high: nextHighValue };
        onSetRange(low, nextHighValue);
      }
    },
    [trackRef, valueFromPointer, nextLow, nextHigh, onSetRange],
  );

  const endDrag = useCallback(() => {
    const capture = pointerCaptureRef.current;
    if (capture) {
      try {
        capture.el.releasePointerCapture(capture.pointerId);
      } catch {
        /* capture may already be released */
      }
      pointerCaptureRef.current = null;
    }
    dragRef.current = null;
    document.body.classList.remove("is-range-slider-dragging");
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => moveDrag(e);
    const up = () => endDrag();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [moveDrag, endDrag]);

  const beginDrag = useCallback((e: ReactPointerEvent, handle: "low" | "high") => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    pointerCaptureRef.current = { el, pointerId: e.pointerId };
    dragRef.current = handle;
    document.body.classList.add("is-range-slider-dragging");
    document.body.style.cursor = "grabbing";
  }, []);

  const beginLowDrag = useCallback(
    (e: ReactPointerEvent) => beginDrag(e, "low"),
    [beginDrag],
  );

  const beginHighDrag = useCallback(
    (e: ReactPointerEvent) => beginDrag(e, "high"),
    [beginDrag],
  );

  return { beginLowDrag, beginHighDrag };
}
