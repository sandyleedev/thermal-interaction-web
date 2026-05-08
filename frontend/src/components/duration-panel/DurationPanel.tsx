import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  DURATION_MAJOR_TICKS,
  DURATION_MAX_S,
  DURATION_MIN_RATIO,
  DURATION_MIN_S,
  normToDuration,
  durationToNorm,
  formatDurationForUi,
} from "./durationPanelUtils";
import { durationRangeOverlapsFilter } from "@/lib/research/filterResearchPapers";
import { buildDurationKdePathsHorizontal } from "./durationPanelDensity";

const TRACK_H = 22;
const PLOT_W = 320;
const PLOT_H = 76;
const PLOT_PAD = { left: 0, right: 0, top: 4, bottom: 8 } as const;
const SLIDER_EDGE_INSET_PX = 0;

type DragHandle = "low" | "high" | null;

function durationNormFromClientX(clientX: number, rect: DOMRect): number {
  const w = rect.width - SLIDER_EDGE_INSET_PX * 2;
  if (w <= 0) return 0.5;
  return Math.min(1, Math.max(0, (clientX - rect.left - SLIDER_EDGE_INSET_PX) / w));
}

function sliderLeftForNorm(norm: number): string {
  const n = Math.min(1, Math.max(0, norm));
  const i = SLIDER_EDGE_INSET_PX;
  const w = i * 2;
  return `calc(${i}px + (100% - ${w}px) * ${n})`;
}

function sliderRangeStyle(rangeLeft: number, rangeWidth: number): { left: string; width: string } {
  const i = SLIDER_EDGE_INSET_PX;
  const w = i * 2;
  return {
    left: `calc(${i}px + (100% - ${w}px) * ${Math.min(1, Math.max(0, rangeLeft))})`,
    width: `calc((100% - ${w}px) * ${Math.min(1, Math.max(0, rangeWidth))})`,
  };
}

function sliderRightEdge(rangeLeft: number, rangeWidth: number): string {
  const i = SLIDER_EDGE_INSET_PX;
  const w = i * 2;
  return `calc(${i}px + (100% - ${w}px) * ${Math.min(1, Math.max(0, rangeLeft + rangeWidth))})`;
}

export function DurationPanel() {
  const violinClipId = useId().replace(/:/g, "");
  const trackRef = useRef<HTMLDivElement>(null);
  const {
    durationLowS,
    durationHighS,
    durationDensityPapers,
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
    const t = normToDuration(durationNormFromClientX(e.clientX, rect));
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
  const lowHandleNearEdge = nLow <= 0.02;
  const highHandleNearEdge = nHigh >= 0.98;

  const handlesClose = rangeWidth < 0.14;
  const durationAxisTotal = durationDensityPapers.length;
  const durationAxisSelected = useMemo(
    () =>
      durationDensityPapers.filter((paper) =>
        durationRangeOverlapsFilter(
          paper.durationMinS,
          paper.durationMaxS,
          filterLowS,
          filterHighS,
        ),
      ).length,
    [durationDensityPapers, filterLowS, filterHighS],
  );
  const durationSelectionRatioPct =
    durationAxisTotal > 0 ? (durationAxisSelected / durationAxisTotal) * 100 : 0;
  const centerDurationsS = useMemo(
    () =>
      durationDensityPapers.map((paper) => (paper.durationMinS + paper.durationMaxS) / 2),
    [durationDensityPapers],
  );
  const kdePaths = useMemo(
    () => buildDurationKdePathsHorizontal(centerDurationsS, PLOT_W, PLOT_H, PLOT_PAD),
    [centerDurationsS],
  );
  const innerW = PLOT_W - PLOT_PAD.left - PLOT_PAD.right;
  const innerH = PLOT_H - PLOT_PAD.top - PLOT_PAD.bottom;
  const violinSelectionX = PLOT_PAD.left + innerW * rangeLeft;
  const violinSelectionW = innerW * rangeWidth;
  const violinLabelXRaw = violinSelectionX + violinSelectionW / 2;
  const violinLabelX = Math.max(
    PLOT_PAD.left + 14,
    Math.min(PLOT_W - PLOT_PAD.right - 14, violinLabelXRaw),
  );

  return (
    <section
      className="landing-panel landing-panel-top landing-duration-panel"
    >
      <h2 className="panel-title">Duration</h2>
      <div className="panel-content duration-panel-content">
        <div className="duration-panel-plot duration-panel-plot--horizontal">
          <svg
            className="temperature-distribution-svg temperature-distribution-svg--horizontal"
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Paper count density by study duration (single-sided violin), horizontal axis"
          >
            <defs>
              <clipPath id={`duration-violin-clip-${violinClipId}`}>
                <path d={kdePaths.areaD} />
              </clipPath>
            </defs>
            <path d={kdePaths.areaD} className="distribution-violin-area" />
            <rect
              x={violinSelectionX}
              y={PLOT_PAD.top}
              width={Math.max(0, violinSelectionW)}
              height={innerH}
              className="distribution-violin-selection-fill"
              clipPath={`url(#duration-violin-clip-${violinClipId})`}
            />
            <path
              d={kdePaths.lineD}
              className="distribution-violin-line"
              fill="none"
            />
            <text
              x={violinLabelX}
              y={PLOT_PAD.top + innerH * 0.58}
              className="distribution-violin-selection-label"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {Math.round(durationSelectionRatioPct)}%
            </text>
          </svg>
        </div>
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
                  style={{ left: sliderLeftForNorm(durationToNorm(s)) }}
                  aria-hidden
                />
              ))}
              <div
                className="duration-slider-range"
                style={sliderRangeStyle(rangeLeft, rangeWidth)}
              />
              <div
                className="duration-slider-dim duration-slider-dim--left"
                style={{ width: sliderRangeStyle(rangeLeft, rangeWidth).left }}
              />
              <div
                className="duration-slider-dim duration-slider-dim--right"
                style={{ left: sliderRightEdge(rangeLeft, rangeWidth) }}
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
              style={{ left: sliderLeftForNorm(nHigh) }}
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
                {formatDurationForUi(filterHighS)}
              </span>
            </div>
          </div>
          <div className="duration-slider-ticks">
            {DURATION_MAJOR_TICKS.map(({ s, label }) => (
              <span
                key={s}
                className="duration-slider-tick"
                style={{ left: sliderLeftForNorm(durationToNorm(s)) }}
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
