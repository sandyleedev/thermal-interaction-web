import { useCallback, useEffect, useRef } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  insetDimLeftWidth,
  insetDimRightLeftEdge,
  insetRangeLayerStyle,
  thumbCenterLeftCalc,
} from "@/components/range-slider/horizontalRangeTrackInset";
import {
  clientXToDuration,
  DURATION_MAJOR_TICKS,
  DURATION_MAX_S,
  DURATION_MIN_RATIO,
  DURATION_MIN_S,
  durationToNorm,
  formatDurationForUi,
} from "./durationPanelUtils";

const TRACK_H = 22;

type DragHandle = "low" | "high" | null;

export function DurationPanel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const {
    durationLowS,
    durationHighS,
    setDurationRange,
  } = useResearchFilter();
  const filterLowS = durationLowS;
  const filterHighS = durationHighS;
  const rangeRef = useRef({ low: filterLowS, high: filterHighS });
  const dragRef = useRef<DragHandle>(null);

  useEffect(() => {
    rangeRef.current = { low: filterLowS, high: filterHighS };
  }, [filterLowS, filterHighS]);

  const moveDrag = useCallback((e: PointerEvent) => {
    const el = trackRef.current;
    if (!el || !dragRef.current) return;
    const rect = el.getBoundingClientRect();
    const t = clientXToDuration(e.clientX, rect);
    const { low, high } = rangeRef.current;
    if (dragRef.current === "low") {
      const maxLow = high / DURATION_MIN_RATIO;
      const next = Math.min(Math.max(DURATION_MIN_S, t), maxLow);
      rangeRef.current = { low: next, high };
      setDurationRange(next, high);
    } else {
      const minHigh = low * DURATION_MIN_RATIO;
      const next = Math.max(Math.min(DURATION_MAX_S, t), minHigh);
      rangeRef.current = { low, high: next };
      setDurationRange(low, next);
    }
  }, [setDurationRange]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
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

  const nLow = durationToNorm(filterLowS);
  const nHigh = durationToNorm(filterHighS);
  const rangeLeft = Math.min(nLow, nHigh);
  const rangeWidth = Math.abs(nHigh - nLow);

  const handlesClose = rangeWidth < 0.14;

  return (
    <section className="landing-panel landing-panel-top landing-duration-panel">
      <h2 className="panel-title">Duration</h2>
      <div className="panel-content duration-panel-content">
        <div className="duration-slider-row">
          <div
            ref={trackRef}
            className="duration-slider-track"
            style={{ minHeight: TRACK_H }}
            role="group"
            aria-label="Duration range filter"
          >
            <div className="duration-slider-track-fill">
              <div className="duration-slider-track-base" />
              {DURATION_MAJOR_TICKS.map(({ s }) => (
                <div
                  key={`tick-${s}`}
                  className="duration-slider-minor-tick"
                  style={{ left: thumbCenterLeftCalc(durationToNorm(s)) }}
                  aria-hidden
                />
              ))}
              <div
                className="duration-slider-range"
                style={insetRangeLayerStyle(rangeLeft, rangeWidth)}
              />
              <div
                className="duration-slider-dim duration-slider-dim--left"
                style={insetDimLeftWidth(rangeLeft)}
              />
              <div
                className="duration-slider-dim duration-slider-dim--right"
                style={{ left: insetDimRightLeftEdge(rangeLeft, rangeWidth) }}
              />
            </div>
            <div
              className={[
                "range-slider-thumb-stack",
                "range-slider-thumb-stack--horizontal",
                "range-slider-thumb-stack--low",
                handlesClose && "range-slider-thumb-stack--spread",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ left: thumbCenterLeftCalc(nLow) }}
            >
              <button
                type="button"
                className="temperature-slider-handle temperature-slider-handle-low temperature-slider-handle--horizontal duration-slider-handle--neutral"
                aria-label={`Minimum duration ${formatDurationForUi(filterLowS)}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  dragRef.current = "low";
                  document.body.style.cursor = "grabbing";
                }}
              />
              <span
                className={[
                  "range-slider-value-pill",
                  handlesClose && "range-slider-value-pill--spread-low",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              >
                {formatDurationForUi(filterLowS)}
              </span>
            </div>
            <div
              className={[
                "range-slider-thumb-stack",
                "range-slider-thumb-stack--horizontal",
                "range-slider-thumb-stack--high",
                handlesClose && "range-slider-thumb-stack--spread",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ left: thumbCenterLeftCalc(nHigh) }}
            >
              <button
                type="button"
                className="temperature-slider-handle temperature-slider-handle-high temperature-slider-handle--horizontal duration-slider-handle--neutral"
                aria-label={`Maximum duration ${formatDurationForUi(filterHighS)}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  dragRef.current = "high";
                  document.body.style.cursor = "grabbing";
                }}
              />
              <span
                className={[
                  "range-slider-value-pill",
                  handlesClose && "range-slider-value-pill--spread-high",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              >
                {formatDurationForUi(filterHighS)}
              </span>
            </div>
          </div>
          <div className="duration-slider-ticks">
            {DURATION_MAJOR_TICKS.map(({ s, label }) => (
              <span
                key={s}
                className="duration-slider-tick"
                style={{ left: thumbCenterLeftCalc(durationToNorm(s)) }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
