import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { paperMatchesTemperatureAxis } from "@/lib/research/filterResearchPapers";
import { buildKdePathsHorizontal } from "./temperaturePanelDensity";
import {
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
  tempToNorm,
} from "./temperaturePanelUtils";

const PLOT_W = 320;
const TRACK_H = 22;
const SLIDER_EDGE_INSET_PX = 0;

type DragHandle = "low" | "high" | null;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function normFromClientX(clientX: number, rect: DOMRect): number {
  const w = rect.width - SLIDER_EDGE_INSET_PX * 2;
  if (w <= 0) return 0.5;
  return clamp01((clientX - rect.left - SLIDER_EDGE_INSET_PX) / w);
}

function sliderLeftForNorm(norm: number): string {
  const n = clamp01(norm);
  const i = SLIDER_EDGE_INSET_PX;
  const w = i * 2;
  return `calc(${i}px + (100% - ${w}px) * ${n})`;
}

function sliderRangeStyle(rangeLeft: number, rangeWidth: number): { left: string; width: string } {
  const i = SLIDER_EDGE_INSET_PX;
  const w = i * 2;
  return {
    left: `calc(${i}px + (100% - ${w}px) * ${clamp01(rangeLeft)})`,
    width: `calc((100% - ${w}px) * ${clamp01(rangeWidth)})`,
  };
}

function sliderRightEdge(rangeLeft: number, rangeWidth: number): string {
  const i = SLIDER_EDGE_INSET_PX;
  const w = i * 2;
  return `calc(${i}px + (100% - ${w}px) * ${clamp01(rangeLeft + rangeWidth)})`;
}

export type TemperaturePanelHorizontalProps = {
  /** Shorter plot and tighter chrome for compact center column usage. */
  compact?: boolean;
};

/**
 * Horizontal temperature panel with a bottom range slider (cold left -> hot right).
 */
export function TemperaturePanelHorizontal({
  compact = false,
}: TemperaturePanelHorizontalProps = {}) {
  const violinClipId = useId().replace(/:/g, "");
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
    includeUnspecifiedTemperature,
    setIncludeUnspecifiedTemperature,
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
      temperatureDensityPapers
        .filter((p) => p.minTempC != null && p.maxTempC != null)
        .map((p) => ((p.minTempC as number) + (p.maxTempC as number)) / 2),
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
    const n = normFromClientX(e.clientX, rect);
    const t = TEMP_AXIS_MIN + n * (TEMP_AXIS_MAX - TEMP_AXIS_MIN);
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
  const lowHandleNearEdge = nLow <= 0.02;
  const highHandleNearEdge = nHigh >= 0.98;

  const handlesClose = rangeWidth < 0.14;
  const temperatureAxisTotal = temperatureDensityPapers.length;
  const temperatureAxisSelected = useMemo(
    () =>
      temperatureDensityPapers.filter((paper) =>
        paperMatchesTemperatureAxis(
          paper,
          filterLow,
          filterHigh,
          includeUnspecifiedTemperature,
        ),
      ).length,
    [
      temperatureDensityPapers,
      filterLow,
      filterHigh,
      includeUnspecifiedTemperature,
    ],
  );
  const temperatureSelectionRatioPct =
    temperatureAxisTotal > 0 ? (temperatureAxisSelected / temperatureAxisTotal) * 100 : 0;
  const innerW = PLOT_W - PAD.left - PAD.right;
  const innerH = PLOT_H - PAD.top - PAD.bottom;
  const violinSelectionX = PAD.left + innerW * rangeLeft;
  const violinSelectionW = innerW * rangeWidth;
  const violinLabelXRaw = violinSelectionX + violinSelectionW / 2;
  const violinLabelX = Math.max(
    PAD.left + 14,
    Math.min(PLOT_W - PAD.right - 14, violinLabelXRaw),
  );

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
            aria-label="Paper count density by study temperature (single-sided violin), horizontal axis"
          >
            <defs>
              <clipPath id={`temperature-violin-clip-${violinClipId}`}>
                <path d={kdePaths.areaD} />
              </clipPath>
            </defs>
            <path d={kdePaths.areaD} className="distribution-violin-area" />
            <rect
              x={violinSelectionX}
              y={PAD.top}
              width={Math.max(0, violinSelectionW)}
              height={innerH}
              className="distribution-violin-selection-fill"
              clipPath={`url(#temperature-violin-clip-${violinClipId})`}
            />
            <path
              d={kdePaths.lineD}
              className="distribution-violin-line"
              fill="none"
            />
            <text
              x={violinLabelX}
              y={PAD.top + innerH * 0.68}
              className="distribution-violin-selection-label"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {Math.round(temperatureSelectionRatioPct)}%
            </text>
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
                style={{
                  width: sliderRangeStyle(rangeLeft, rangeWidth).left,
                }}
              />
              <div
                className="temperature-slider-track-dim temperature-slider-track-dim--horizontal temperature-slider-track-dim--horizontal-right"
                style={{
                  left: sliderRightEdge(rangeLeft, rangeWidth),
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
              style={{ left: sliderLeftForNorm(nLow) }}
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
                  handlesClose &&
                    !lowHandleNearEdge &&
                    !highHandleNearEdge &&
                    "range-slider-value-pill--spread-low",
                  lowHandleNearEdge && "range-slider-value-pill--edge-left",
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
              style={{ left: sliderLeftForNorm(nHigh) }}
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
                  handlesClose &&
                    !lowHandleNearEdge &&
                    !highHandleNearEdge &&
                    "range-slider-value-pill--spread-high",
                  highHandleNearEdge && "range-slider-value-pill--edge-right",
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
                style={{ left: sliderLeftForNorm(tempToNorm(t)) }}
              >
                {t}°
              </span>
            ))}
          </div>
        </div>
        <label className="filter-include-unspecified">
          <input
            type="checkbox"
            checked={includeUnspecifiedTemperature}
            onChange={(e) => setIncludeUnspecifiedTemperature(e.target.checked)}
          />
          Include unspecified values
        </label>
      </div>
    </section>
  );
}
