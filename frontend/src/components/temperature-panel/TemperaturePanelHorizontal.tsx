import { useCallback, useEffect, useMemo, useRef } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  insetDimLeftWidth,
  insetDimRightLeftEdge,
  thumbCenterLeftCalc,
} from "@/components/range-slider/horizontalRangeTrackInset";
import { buildKdePathsHorizontal } from "./temperaturePanelDensity";
import { clientXToTemp, tempToNorm } from "./temperaturePanelUtils";

const PLOT_W = 320;
const TRACK_H = 22;

type DragHandle = "low" | "high" | null;

export type TemperaturePanelHorizontalProps = {
  /** Shorter plot and tighter chrome (e.g. Demo 2 center column). */
  compact?: boolean;
};

/**
 * Panel 2 horizontal layout: same data/utils/styles as {@link TemperaturePanel},
 * with a bottom horizontal range slider (cold left → hot right).
 */
export function TemperaturePanelHorizontal({
  compact = false,
}: TemperaturePanelHorizontalProps = {}) {
  const PLOT_H = compact ? 58 : 88;
  const PAD = compact
    ? { left: 10, right: 10, top: 3, bottom: 7 }
    : { left: 10, right: 10, top: 6, bottom: 10 };

  const trackRef = useRef<HTMLDivElement>(null);
  const {
    temperatureDensityPapers,
    tempLowC,
    tempHighC,
    setTempRange,
  } = useResearchFilter();
  const filterLow = tempLowC;
  const filterHigh = tempHighC;
  const rangeRef = useRef({ low: filterLow, high: filterHigh });
  const dragRef = useRef<DragHandle>(null);

  useEffect(() => {
    rangeRef.current = { low: filterLow, high: filterHigh };
  }, [filterLow, filterHigh]);

  const centerTemps = useMemo(
    () =>
      temperatureDensityPapers.map((p) => (p.minC + p.maxC) / 2),
    [temperatureDensityPapers],
  );

  const kdePaths = useMemo(
    () =>
      buildKdePathsHorizontal(centerTemps, PLOT_W, PLOT_H, PAD),
    [centerTemps, compact],
  );

  const moveDrag = useCallback((e: PointerEvent) => {
    const el = trackRef.current;
    if (!el || !dragRef.current) return;
    const rect = el.getBoundingClientRect();
    const t = clientXToTemp(e.clientX, rect);
    const { low, high } = rangeRef.current;
    if (dragRef.current === "low") {
      const next = Math.min(t, high - 0.5);
      rangeRef.current = { low: next, high };
      setTempRange(next, high);
    } else {
      const next = Math.max(t, low + 0.5);
      rangeRef.current = { low, high: next };
      setTempRange(low, next);
    }
  }, [setTempRange]);

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

  const nLow = tempToNorm(filterLow);
  const nHigh = tempToNorm(filterHigh);
  const rangeLeft = Math.min(nLow, nHigh);
  const rangeWidth = Math.abs(nHigh - nLow);

  const handlesClose = rangeWidth < 0.14;

  const tickLabels = [100, 75, 50, 25, 0, -10];

  return (
    <section
      className={[
        "landing-panel",
        "landing-panel-top",
        "landing-temperature-panel",
        "landing-temperature-panel--horizontal",
        compact && "landing-temperature-panel--compact",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h2 className="panel-title">Temperature</h2>
      <div className="panel-content temperature-panel-content temperature-panel-content--horizontal">
        <div className="temperature-panel-plot temperature-panel-plot--horizontal">
          <svg
            className="temperature-distribution-svg temperature-distribution-svg--horizontal"
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Paper count density by study temperature (KDE curve), horizontal axis"
          >
            <path
              d={kdePaths.lineD}
              className="temperature-kde-line"
              fill="none"
            />
          </svg>
        </div>

        <div className="temperature-slider-row temperature-slider-row--horizontal">
          <div
            ref={trackRef}
            className="temperature-slider-track temperature-slider-track--horizontal"
            style={{ height: TRACK_H }}
          >
            <div className="temperature-slider-track-fill temperature-slider-track-fill--horizontal">
              <div className="temperature-slider-track-gradient temperature-slider-track-gradient--horizontal" />
              <div
                className="temperature-slider-track-dim temperature-slider-track-dim--horizontal"
                style={insetDimLeftWidth(rangeLeft)}
              />
              <div
                className="temperature-slider-track-dim temperature-slider-track-dim--horizontal temperature-slider-track-dim--horizontal-right"
                style={{
                  left: insetDimRightLeftEdge(rangeLeft, rangeWidth),
                }}
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
                className="temperature-slider-handle temperature-slider-handle-low temperature-slider-handle--horizontal"
                aria-label={`Minimum temperature ${Math.round(filterLow)} degrees Celsius`}
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
                {Math.round(filterLow)}°C
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
                className="temperature-slider-handle temperature-slider-handle-high temperature-slider-handle--horizontal"
                aria-label={`Maximum temperature ${Math.round(filterHigh)} degrees Celsius`}
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
                {Math.round(filterHigh)}°C
              </span>
            </div>
          </div>
          <div className="temperature-slider-ticks temperature-slider-ticks--horizontal">
            {tickLabels.map((t) => (
              <span
                key={t}
                className="temperature-slider-tick temperature-slider-tick--horizontal"
                style={{ left: thumbCenterLeftCalc(tempToNorm(t)) }}
              >
                {t}°
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
