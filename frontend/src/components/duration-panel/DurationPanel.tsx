import { useCallback, useMemo, useRef } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  DURATION_MAJOR_TICKS,
  DURATION_MAX_S,
  DURATION_MIN_RATIO,
  DURATION_MIN_S,
  normToDuration,
  durationToNorm,
  durationTickNorm,
  formatDurationForUi,
} from "@/components/duration-panel/durationPanelUtils";
import {
  paperHasReportedDurationRange,
  paperMatchesDurationAxis,
} from "@/lib/research/filterResearchPapers";
import { buildDurationKdePathsHorizontal } from "@/components/duration-panel/durationPanelDensity";
import { DistributionViolinPlot } from "@/components/distribution-violin/DistributionViolinPlot";
import {
  normFromClientX,
  sliderLeftForNorm,
  sliderRangeStyle,
  sliderRightEdge,
} from "@/components/range-slider/horizontalRangeSliderLayout";
import { RangeSliderThumbStack } from "@/components/range-slider/RangeSliderThumbStack";
import { useWindowPointerRangeDrag } from "@/components/range-slider/useWindowPointerRangeDrag";
import { FilterPanelInfoButton } from "@/components/landing/FilterPanelInfoButton";

const DURATION_FILTER_TOOLTIP =
  "Drag handles for duration (log scale). Chart uses your other filters.";
const DURATION_INCLUDE_UNSPECIFIED_TOOLTIP =
  "Some papers may not report the stimulation duration. Select this option to include those papers in the results.";

const TRACK_H = 22;
const PLOT_W = 320;
const PLOT_H = 76;
const PLOT_PAD = { left: 0, right: 0, top: 4, bottom: 8 } as const;

/**
 * Horizontal duration panel: KDE violin (log-scaled axis) and a dual-handle range slider.
 * `durationDensityPapers` omits the duration filter so the distribution stays stable while dragging.
 */
export function DurationPanel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const {
    durationLowS,
    durationHighS,
    durationDensityPapers,
    setDurationRange,
    clearDurationFilter,
    includeUnspecifiedDuration,
    setIncludeUnspecifiedDuration,
  } = useResearchFilter();
  const filterLowS = durationLowS;
  const filterHighS = durationHighS;

  const valueFromPointer = useCallback((clientX: number, rect: DOMRect) => {
    return normToDuration(normFromClientX(clientX, rect));
  }, []);

  const { beginLowDrag, beginHighDrag } = useWindowPointerRangeDrag({
    trackRef,
    filterLow: filterLowS,
    filterHigh: filterHighS,
    onSetRange: setDurationRange,
    valueFromPointer,
    nextLow: (value, high) => {
      const maxLow = high / DURATION_MIN_RATIO;
      return Math.min(Math.max(DURATION_MIN_S, value), maxLow);
    },
    nextHigh: (low, value) => {
      const minHigh = low * DURATION_MIN_RATIO;
      return Math.max(Math.min(DURATION_MAX_S, value), minHigh);
    },
  });

  const nLow = durationToNorm(filterLowS);
  const nHigh = durationToNorm(filterHighS);
  const rangeLeft = Math.min(nLow, nHigh);
  const rangeWidth = Math.abs(nHigh - nLow);
  const lowHandleNearEdge = nLow <= 0.02;
  const highHandleNearEdge = nHigh >= 0.98;
  const handlesClose = rangeWidth < 0.14;
  const spreadPill =
    handlesClose && !lowHandleNearEdge && !highHandleNearEdge;

  const durationAxisTotal = durationDensityPapers.length;
  const durationAxisSelected = useMemo(
    () =>
      durationDensityPapers.filter((paper) =>
        paperMatchesDurationAxis(
          paper,
          filterLowS,
          filterHighS,
          includeUnspecifiedDuration,
        ),
      ).length,
    [
      durationDensityPapers,
      filterLowS,
      filterHighS,
      includeUnspecifiedDuration,
    ],
  );
  const durationSelectionRatioPct =
    durationAxisTotal > 0
      ? (durationAxisSelected / durationAxisTotal) * 100
      : 0;

  const centerDurationsS = useMemo(
    () =>
      durationDensityPapers
        .filter((p) => paperHasReportedDurationRange(p))
        .map(
          (p) =>
            ((p.minDurationSec as number) + (p.maxDurationSec as number)) / 2,
        ),
    [durationDensityPapers],
  );

  const kdePaths = useMemo(
    () =>
      buildDurationKdePathsHorizontal(
        centerDurationsS,
        PLOT_W,
        PLOT_H,
        PLOT_PAD,
      ),
    [centerDurationsS],
  );

  const hasActiveDurationFilter =
    filterLowS !== DURATION_MIN_S ||
    filterHighS !== DURATION_MAX_S ||
    includeUnspecifiedDuration;

  const rangeStyle = sliderRangeStyle(rangeLeft, rangeWidth);

  return (
    <section className="landing-panel landing-panel-top landing-duration-panel">
      <div className="range-filter-panel-header">
        <div className="range-filter-panel-title-cluster">
          <h2 className="panel-title">Duration</h2>
          <FilterPanelInfoButton tooltip={DURATION_FILTER_TOOLTIP} />
        </div>
        <button
          type="button"
          className="other-filters-clear-all"
          disabled={!hasActiveDurationFilter}
          onClick={clearDurationFilter}
        >
          Clear
        </button>
      </div>
      <div className="panel-content duration-panel-content">
        <DistributionViolinPlot
          plotWidth={PLOT_W}
          plotHeight={PLOT_H}
          padding={PLOT_PAD}
          kdePaths={kdePaths}
          rangeLeft={rangeLeft}
          rangeWidth={rangeWidth}
          selectionRatioPct={durationSelectionRatioPct}
          selectionLabelYFactor={0.58}
          ariaLabel="Paper count density by study duration (single-sided violin), horizontal axis"
          plotClassName="duration-panel-plot duration-panel-plot--horizontal"
          svgClassName="temperature-distribution-svg temperature-distribution-svg--horizontal"
        />

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
              {DURATION_MAJOR_TICKS.map(({ s, hideWhenSparse }) => (
                <div
                  key={`tick-${s}`}
                  className={[
                    "duration-slider-minor-tick",
                    hideWhenSparse && "duration-slider-minor-tick--hide-sparse",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ left: sliderLeftForNorm(durationTickNorm(s)) }}
                  aria-hidden
                />
              ))}
              <div className="duration-slider-range" style={rangeStyle} />
              <div
                className="duration-slider-dim duration-slider-dim--left"
                style={{ width: rangeStyle.left }}
              />
              <div
                className="duration-slider-dim duration-slider-dim--right"
                style={{ left: sliderRightEdge(rangeLeft, rangeWidth) }}
              />
            </div>
            <RangeSliderThumbStack
              side="low"
              norm={nLow}
              handlesClose={handlesClose}
              spreadPill={spreadPill}
              nearEdge={lowHandleNearEdge}
              handleClassName="temperature-slider-handle temperature-slider-handle-low temperature-slider-handle--horizontal duration-slider-handle--neutral"
              ariaLabel={`Minimum duration ${formatDurationForUi(filterLowS)}`}
              pillText={formatDurationForUi(filterLowS)}
              onPointerDown={beginLowDrag}
            />
            <RangeSliderThumbStack
              side="high"
              norm={nHigh}
              handlesClose={handlesClose}
              spreadPill={spreadPill}
              nearEdge={highHandleNearEdge}
              handleClassName="temperature-slider-handle temperature-slider-handle-high temperature-slider-handle--horizontal duration-slider-handle--neutral"
              ariaLabel={`Maximum duration ${formatDurationForUi(filterHighS)}`}
              pillText={formatDurationForUi(filterHighS)}
              onPointerDown={beginHighDrag}
            />
          </div>
          <div className="duration-slider-ticks">
            {DURATION_MAJOR_TICKS.map(({ s, label, shortLabel, hideWhenSparse }) => (
              <span
                key={s}
                className={[
                  "duration-slider-tick",
                  hideWhenSparse && "duration-slider-tick--hide-sparse",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ left: sliderLeftForNorm(durationTickNorm(s)) }}
                aria-label={label}
              >
                <span className="duration-slider-tick-text duration-slider-tick-text--full">
                  {label}
                </span>
                <span
                  className="duration-slider-tick-text duration-slider-tick-text--short"
                  aria-hidden
                >
                  {shortLabel}
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="filter-include-unspecified-row">
          <label className="filter-include-unspecified">
            <input
              type="checkbox"
              checked={includeUnspecifiedDuration}
              onChange={(e) => setIncludeUnspecifiedDuration(e.target.checked)}
            />
            Include unspecified values
          </label>
          <FilterPanelInfoButton
            tooltip={DURATION_INCLUDE_UNSPECIFIED_TOOLTIP}
            ariaLabel="What include unspecified values means"
            floating
            tooltipPlacement="above"
          />
        </div>
      </div>
    </section>
  );
}
