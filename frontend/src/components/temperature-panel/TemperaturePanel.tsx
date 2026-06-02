import { useCallback, useMemo, useRef } from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { paperMatchesTemperatureAxis } from "@/lib/research/filterResearchPapers";
import { buildKdePathsHorizontal } from "@/components/temperature-panel/temperaturePanelDensity";
import { DistributionViolinPlot } from "@/components/distribution-violin/DistributionViolinPlot";
import {
  normFromClientX,
  sliderLeftForNorm,
  sliderRangeStyle,
  sliderRightEdge,
} from "@/components/range-slider/horizontalRangeSliderLayout";
import { RangeSliderThumbStack } from "@/components/range-slider/RangeSliderThumbStack";
import { useWindowPointerRangeDrag } from "@/components/range-slider/useWindowPointerRangeDrag";
import {
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
  tempToNorm,
} from "@/components/temperature-panel/temperaturePanelUtils";

const PLOT_W = 320;
const PLOT_H = 58;
const TRACK_H = 22;
const PAD = { left: 10, right: 10, top: 3, bottom: 7 } as const;

const TICK_LABELS = [100, 75, 50, 25, 0, -10] as const;

/**
 * Horizontal temperature panel with a bottom range slider (cold left -> hot right).
 */
export function TemperaturePanel() {
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

  const valueFromPointer = useCallback((clientX: number, rect: DOMRect) => {
    const n = normFromClientX(clientX, rect);
    return TEMP_AXIS_MIN + n * (TEMP_AXIS_MAX - TEMP_AXIS_MIN);
  }, []);

  const { beginLowDrag, beginHighDrag } = useWindowPointerRangeDrag({
    trackRef,
    filterLow,
    filterHigh,
    onSetRange: setTempRange,
    valueFromPointer,
    nextLow: (value, high) => Math.min(value, high - 0.5),
    nextHigh: (low, value) => Math.max(value, low + 0.5),
  });

  const centerTemps = useMemo(
    () =>
      temperatureDensityPapers
        .filter((p) => p.minTempC != null && p.maxTempC != null)
        .map((p) => ((p.minTempC as number) + (p.maxTempC as number)) / 2),
    [temperatureDensityPapers],
  );

  const kdePaths = useMemo(
    () => buildKdePathsHorizontal(centerTemps, PLOT_W, PLOT_H, PAD),
    [centerTemps],
  );

  const nLow = tempToNorm(filterLow);
  const nHigh = tempToNorm(filterHigh);
  const rangeLeft = Math.min(nLow, nHigh);
  const rangeWidth = Math.abs(nHigh - nLow);
  const lowHandleNearEdge = nLow <= 0.02;
  const highHandleNearEdge = nHigh >= 0.98;
  const handlesClose = rangeWidth < 0.14;
  const spreadPill =
    handlesClose && !lowHandleNearEdge && !highHandleNearEdge;

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

  const hasActiveTemperatureFilter =
    filterLow !== TEMP_AXIS_MIN ||
    filterHigh !== TEMP_AXIS_MAX ||
    includeUnspecifiedTemperature;

  return (
    <section className="landing-panel landing-panel-top landing-temperature-panel">
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
        <DistributionViolinPlot
          plotWidth={PLOT_W}
          plotHeight={PLOT_H}
          padding={PAD}
          kdePaths={kdePaths}
          rangeLeft={rangeLeft}
          rangeWidth={rangeWidth}
          selectionRatioPct={temperatureSelectionRatioPct}
          ariaLabel="Paper count density by study temperature (single-sided violin), horizontal axis"
          plotClassName="temperature-panel-plot"
          svgClassName="temperature-distribution-svg"
        />

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
            <RangeSliderThumbStack
              side="low"
              norm={nLow}
              handlesClose={handlesClose}
              spreadPill={spreadPill}
              nearEdge={lowHandleNearEdge}
              handleClassName="temperature-slider-handle temperature-slider-handle-low temperature-slider-handle--horizontal"
              ariaLabel={`Minimum temperature ${Math.round(filterLow)} degrees Celsius`}
              pillText={`${Math.round(filterLow)}°C`}
              onPointerDown={beginLowDrag}
            />
            <RangeSliderThumbStack
              side="high"
              norm={nHigh}
              handlesClose={handlesClose}
              spreadPill={spreadPill}
              nearEdge={highHandleNearEdge}
              handleClassName="temperature-slider-handle temperature-slider-handle-high temperature-slider-handle--horizontal"
              ariaLabel={`Maximum temperature ${Math.round(filterHigh)} degrees Celsius`}
              pillText={`${Math.round(filterHigh)}°C`}
              onPointerDown={beginHighDrag}
            />
          </div>
          <div className="temperature-slider-ticks">
            {TICK_LABELS.map((t) => (
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
