import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { paperMatchesTemperatureAxis } from "@/lib/research/filterResearchPapers";
import { buildKdePathsHorizontal } from "@/components/temperature-panel/temperaturePanelDensity";
import {
  DistributionViolinDefs,
  DISTRIBUTION_PINK_AREA,
  DISTRIBUTION_PINK_SELECTION,
  DISTRIBUTION_PINK_VIVID,
  distributionViolinVisualIds,
} from "@/components/distribution-violin/distributionViolinVisuals";
import {
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
  tempToNorm,
} from "@/components/temperature-panel/temperaturePanelUtils";

const PLOT_W = 320;
const PLOT_H = 58;
const TRACK_H = 22;
const SLIDER_EDGE_INSET_PX = 0;
const PAD = { left: 10, right: 10, top: 3, bottom: 7 } as const;

type DragHandle = "low" | "high" | null;

/** Keep a number inside the 0..1 range. */
function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Convert pointer X position into normalized track position (0..1). */
function normFromClientX(clientX: number, rect: DOMRect): number {
  const w = rect.width - SLIDER_EDGE_INSET_PX * 2;
  if (w <= 0) return 0.5;
  return clamp01((clientX - rect.left - SLIDER_EDGE_INSET_PX) / w);
}

/** Convert normalized position (0..1) to CSS left value for handle/tick placement. */
function sliderLeftForNorm(norm: number): string {
  const n = clamp01(norm);
  const i = SLIDER_EDGE_INSET_PX;
  const w = i * 2;
  return `calc(${i}px + (100% - ${w}px) * ${n})`;
}

/** Convert selected range to CSS left/width for track highlight and dim areas. */
function sliderRangeStyle(
  rangeLeft: number,
  rangeWidth: number,
): { left: string; width: string } {
  const i = SLIDER_EDGE_INSET_PX;
  const w = i * 2;
  return {
    left: `calc(${i}px + (100% - ${w}px) * ${clamp01(rangeLeft)})`,
    width: `calc((100% - ${w}px) * ${clamp01(rangeWidth)})`,
  };
}

/** Return CSS left value for the right edge of the selected range. */
function sliderRightEdge(rangeLeft: number, rangeWidth: number): string {
  const i = SLIDER_EDGE_INSET_PX;
  const w = i * 2;
  return `calc(${i}px + (100% - ${w}px) * ${clamp01(rangeLeft + rangeWidth)})`;
}

/**
 * Horizontal temperature panel with a bottom range slider (cold left -> hot right).
 */
export function TemperaturePanel() {
  const violinClipId = useId().replace(/:/g, "");

  const trackRef = useRef<HTMLDivElement>(null);
  const {
    temperatureDensityPapers,
    tempLowC,
    tempHighC,
    setTempRange,
    clearTemperatureFilter,
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

  /** Center temperature per paper: (minTempC + maxTempC) / 2, used for KDE input. */
  const centerTemps = useMemo(
    () =>
      temperatureDensityPapers
        .filter((p) => p.minTempC != null && p.maxTempC != null)
        .map((p) => ((p.minTempC as number) + (p.maxTempC as number)) / 2),
    [temperatureDensityPapers],
  );

  /** KDE paths for the temperature distribution violin plot. */
  const kdePaths = useMemo(
    () => buildKdePathsHorizontal(centerTemps, PLOT_W, PLOT_H, PAD),
    [centerTemps],
  );

  /** Update low/high temperature while dragging a handle. */
  const moveDrag = useCallback(
    (e: PointerEvent) => {
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
    },
    [setTempRange],
  );

  /** Finish dragging and restore cursor state. */
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

  /** True when two slider handles are close enough to risk label overlap. */
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
    temperatureAxisTotal > 0
      ? (temperatureAxisSelected / temperatureAxisTotal) * 100
      : 0;
  const innerW = PLOT_W - PAD.left - PAD.right;
  const innerH = PLOT_H - PAD.top - PAD.bottom;
  const violinSelectionX = PAD.left + innerW * rangeLeft;
  const violinSelectionW = innerW * rangeWidth;
  const violinLabelXRaw = violinSelectionX + violinSelectionW / 2;
  const violinLabelX = Math.max(
    PAD.left + 14,
    Math.min(PLOT_W - PAD.right - 14, violinLabelXRaw),
  );
  const violinVisualIds = distributionViolinVisualIds(violinClipId);
  const hasActiveTemperatureFilter =
    filterLow !== TEMP_AXIS_MIN ||
    filterHigh !== TEMP_AXIS_MAX ||
    includeUnspecifiedTemperature;

  /** Tick labels for the temperature slider (100°C, 75°C, 50°C, 25°C, 0°C, -10°C). */
  const tickLabels = [100, 75, 50, 25, 0, -10];

  return (
    <section
      className={[
        "landing-panel",
        "landing-panel-top",
        "landing-temperature-panel",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="range-filter-panel-header">
        <h2 className="panel-title">Temperature</h2>
        <button
          type="button"
          className="other-filters-clear-all"
          disabled={!hasActiveTemperatureFilter}
          onClick={clearTemperatureFilter}
        >
          Clear
        </button>
      </div>
      <div className="panel-content temperature-panel-content">
        <div className="temperature-panel-plot">
          <svg
            className="temperature-distribution-svg"
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Paper count density by study temperature (single-sided violin), horizontal axis"
          >
            <defs>
              <clipPath id={violinVisualIds.clipId}>
                <path d={kdePaths.areaD} />
              </clipPath>
              <DistributionViolinDefs ids={violinVisualIds} />
            </defs>
            <g filter={`url(#${violinVisualIds.softBlurId})`}>
              <path d={kdePaths.areaD} fill={DISTRIBUTION_PINK_AREA} />
              <rect
                x={violinSelectionX}
                y={PAD.top}
                width={Math.max(0, violinSelectionW)}
                height={innerH}
                fill={DISTRIBUTION_PINK_SELECTION}
                clipPath={`url(#${violinVisualIds.clipId})`}
              />
            </g>
            <path
              d={kdePaths.lineD}
              className="distribution-violin-line"
              fill="none"
              stroke={DISTRIBUTION_PINK_VIVID}
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

        <div className="temperature-slider-row">
          <div
            ref={trackRef}
            className="temperature-slider-track"
            style={{ height: TRACK_H }}
          >
            <div className="temperature-slider-track-fill">
              <div className="temperature-slider-track-gradient" />
              <div
                className="temperature-slider-track-dim"
                style={{
                  width: sliderRangeStyle(rangeLeft, rangeWidth).left,
                }}
              />
              <div
                className="temperature-slider-track-dim temperature-slider-track-dim--right"
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
          <div className="temperature-slider-ticks">
            {tickLabels.map((t) => (
              <span
                key={t}
                className="temperature-slider-tick"
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
