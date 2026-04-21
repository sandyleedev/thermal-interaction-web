import { useCallback, useEffect, useMemo, useRef } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { buildKdePaths } from "./temperaturePanelDensity";
import {
  clientYToTemp,
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
  tempToNorm,
  tempToY,
} from "./temperaturePanelUtils";

const TRACK_H = 240;
/** Tight plot width (scatter zone removed on Demo 1). */
const PLOT_W = 88;
const PLOT_H = TRACK_H;
/** KDE density strip starts just right of this x ({@link buildKdePaths}). */
const DOT_ZONE_RIGHT = 10;
const KDE_STRIP_LEFT = DOT_ZONE_RIGHT + 2;
const KDE_STRIP_RIGHT = PLOT_W - 2;
/** Horizontal mirror pivot for the vertical-panel density curve (Demo 1). */
const KDE_FLIP_CX = (KDE_STRIP_LEFT + KDE_STRIP_RIGHT) / 2;

type DragHandle = "low" | "high" | null;

export type TemperaturePanelProps = {
  /**
   * Passed to the density SVG. Use `"none"` when the plot is narrower than {@link PLOT_W}px so the
   * curve still fills {@link TRACK_H}px vertically (same Y scale as the slider); default `meet` would
   * letterbox and shorten the curve.
   */
  densityPreserveAspectRatio?: string;
};

export function TemperaturePanel({
  densityPreserveAspectRatio = "xMidYMid meet",
}: TemperaturePanelProps = {}) {
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
      buildKdePaths(centerTemps, PLOT_H, PLOT_W, DOT_ZONE_RIGHT, {
        kdeStripInsetPx: 12,
      }),
    [centerTemps],
  );

  const moveDrag = useCallback((e: PointerEvent) => {
    const el = trackRef.current;
    if (!el || !dragRef.current) return;
    const rect = el.getBoundingClientRect();
    const t = clientYToTemp(e.clientY, rect);
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

  const yLow = tempToY(filterLow, TRACK_H);
  const yHigh = tempToY(filterHigh, TRACK_H);
  const activeTop = Math.min(yLow, yHigh);
  const activeH = Math.abs(yHigh - yLow);

  const handlesClose =
    Math.abs(tempToNorm(filterLow) - tempToNorm(filterHigh)) < 0.14;

  const tickLabels = [100, 75, 50, 25, 0, -10];

  return (
    <section className="landing-panel landing-panel-top landing-temperature-panel">
      <h2 className="panel-title">Temperature</h2>
      <div className="panel-content temperature-panel-content">
        <div className="temperature-panel-plot">
          <svg
            className="temperature-distribution-svg"
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            width="100%"
            height={PLOT_H}
            preserveAspectRatio={densityPreserveAspectRatio}
            role="img"
            aria-label="Paper count density by study temperature (KDE curve)"
          >
            <g
              transform={`translate(${KDE_FLIP_CX}, 0) scale(-1, 1) translate(${-KDE_FLIP_CX}, 0)`}
            >
              <path
                d={kdePaths.lineD}
                className="temperature-kde-line"
                fill="none"
              />
            </g>
          </svg>
        </div>

        <div className="temperature-slider-column">
          <div
            ref={trackRef}
            className="temperature-slider-track"
            style={{ height: TRACK_H }}
          >
            <div className="temperature-slider-track-fill">
              <div className="temperature-slider-track-gradient" />
              <div
                className="temperature-slider-track-dim"
                style={{ top: 0, height: activeTop }}
              />
              <div
                className="temperature-slider-track-dim"
                style={{
                  top: activeTop + activeH,
                  height: Math.max(0, TRACK_H - activeTop - activeH),
                }}
              />
            </div>
            <div
              className={[
                "range-slider-thumb-stack",
                "range-slider-thumb-stack--vertical",
                "range-slider-thumb-stack--low",
                handlesClose && "range-slider-thumb-stack--spread",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ top: yLow, left: "50%" }}
            >
              <button
                type="button"
                className="temperature-slider-handle temperature-slider-handle-low"
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
                "range-slider-thumb-stack--vertical",
                "range-slider-thumb-stack--high",
                handlesClose && "range-slider-thumb-stack--spread",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ top: yHigh, left: "50%" }}
            >
              <button
                type="button"
                className="temperature-slider-handle temperature-slider-handle-high"
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
          <div className="temperature-slider-ticks" style={{ height: TRACK_H }}>
            {tickLabels.map((t) => (
              <span
                key={t}
                className={[
                  "temperature-slider-tick",
                  t === TEMP_AXIS_MAX && "temperature-slider-tick--axis-max",
                  t === TEMP_AXIS_MIN && "temperature-slider-tick--axis-min",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  t === TEMP_AXIS_MAX || t === TEMP_AXIS_MIN
                    ? undefined
                    : { top: tempToY(t, TRACK_H) }
                }
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
