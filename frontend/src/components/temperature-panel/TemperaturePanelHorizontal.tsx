import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MOCK_PAPER_TEMP_RANGES } from "./temperaturePanelMockData";
import { buildKdePathsHorizontal, jitter11 } from "./temperaturePanelDensity";
import {
  clientXToTemp,
  rangeOverlapsFilter,
  tempToCoolWarmColor,
  tempToNorm,
  tempToX,
} from "./temperaturePanelUtils";

const PLOT_W = 320;
const PLOT_H = 88;
const PAD = { left: 10, right: 10, top: 6, bottom: 10 };
const INNER_W = PLOT_W - PAD.left - PAD.right;
const DOT_JITTER_X = 6;
const DOT_JITTER_Y = 12;
const TRACK_H = 22;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

type DragHandle = "low" | "high" | null;

/**
 * Panel 2 horizontal layout: same data/utils/styles as {@link TemperaturePanel},
 * with a bottom horizontal range slider (cold left → hot right).
 */
export function TemperaturePanelHorizontal() {
  const trackRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef({ low: 18, high: 55 });
  const [filterLow, setFilterLow] = useState(18);
  const [filterHigh, setFilterHigh] = useState(55);
  const dragRef = useRef<DragHandle>(null);

  useEffect(() => {
    rangeRef.current = { low: filterLow, high: filterHigh };
  }, [filterLow, filterHigh]);

  const papers = MOCK_PAPER_TEMP_RANGES;

  const centerTemps = useMemo(
    () => papers.map((p) => (p.minC + p.maxC) / 2),
    [papers],
  );

  const kdePaths = useMemo(
    () =>
      buildKdePathsHorizontal(centerTemps, PLOT_W, PLOT_H, PAD),
    [centerTemps],
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
      setFilterLow(next);
    } else {
      const next = Math.max(t, low + 0.5);
      rangeRef.current = { low, high: next };
      setFilterHigh(next);
    }
  }, []);

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

  const tickLabels = [100, 75, 50, 25, 0, -10];
  const baselineY = PLOT_H - PAD.bottom;

  return (
    <section className="landing-panel landing-panel-top landing-temperature-panel landing-temperature-panel--horizontal">
      <h2 className="panel-title">Panel 2</h2>
      <div className="panel-content temperature-panel-content temperature-panel-content--horizontal">
        <div className="temperature-panel-plot temperature-panel-plot--horizontal">
          <svg
            className="temperature-distribution-svg temperature-distribution-svg--horizontal"
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Paper count distribution by study temperature, horizontal axis"
          >
            <path
              d={kdePaths.lineD}
              className="temperature-kde-line"
              fill="none"
            />
            {papers.map((p, i) => {
              const mid = (p.minC + p.maxC) / 2;
              const cx =
                PAD.left +
                tempToX(mid, INNER_W) +
                jitter11(hashId(p.id), i) * DOT_JITTER_X;
              const cy =
                baselineY -
                16 +
                jitter11(hashId(p.id) + 41, i) * DOT_JITTER_Y;
              const active = rangeOverlapsFilter(
                p.minC,
                p.maxC,
                filterLow,
                filterHigh,
              );
              return (
                <circle
                  key={p.id}
                  cx={Math.min(
                    PLOT_W - PAD.right - 2,
                    Math.max(PAD.left + 2, cx),
                  )}
                  cy={Math.min(
                    baselineY - 2,
                    Math.max(PAD.top + 2, cy),
                  )}
                  r={2.1}
                  fill={tempToCoolWarmColor(mid)}
                  fillOpacity={active ? 0.92 : 0.44}
                />
              );
            })}
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
                  left: 0,
                  width: `${rangeLeft * 100}%`,
                }}
              />
              <div
                className="temperature-slider-track-dim temperature-slider-track-dim--horizontal"
                style={{
                  left: `${(rangeLeft + rangeWidth) * 100}%`,
                  width: `${Math.max(0, 1 - rangeLeft - rangeWidth) * 100}%`,
                }}
              />
            </div>
            <button
              type="button"
              className="temperature-slider-handle temperature-slider-handle-low temperature-slider-handle--horizontal"
              style={{ left: `${nLow * 100}%` }}
              aria-label={`Minimum temperature ${Math.round(filterLow)} degrees Celsius`}
              onPointerDown={(e) => {
                e.preventDefault();
                dragRef.current = "low";
                document.body.style.cursor = "grabbing";
              }}
            />
            <button
              type="button"
              className="temperature-slider-handle temperature-slider-handle-high temperature-slider-handle--horizontal"
              style={{ left: `${nHigh * 100}%` }}
              aria-label={`Maximum temperature ${Math.round(filterHigh)} degrees Celsius`}
              onPointerDown={(e) => {
                e.preventDefault();
                dragRef.current = "high";
                document.body.style.cursor = "grabbing";
              }}
            />
          </div>
          <div className="temperature-slider-ticks temperature-slider-ticks--horizontal">
            {tickLabels.map((t) => (
              <span
                key={t}
                className="temperature-slider-tick temperature-slider-tick--horizontal"
                style={{ left: `${tempToNorm(t) * 100}%` }}
              >
                {t}°
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="temperature-panel-summary">
        Filter: {Math.round(filterLow)}°C – {Math.round(filterHigh)}°C
      </p>
    </section>
  );
}
