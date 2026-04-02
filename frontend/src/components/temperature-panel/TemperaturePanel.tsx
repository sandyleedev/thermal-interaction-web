import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MOCK_PAPER_TEMP_RANGES } from "./temperaturePanelMockData";
import {
  buildKdePaths,
  jitter11,
} from "./temperaturePanelDensity";
import {
  clientYToTemp,
  rangeOverlapsFilter,
  tempToCoolWarmColor,
  tempToY,
} from "./temperaturePanelUtils";

const TRACK_H = 240;
const PLOT_W = 118;
const PLOT_H = TRACK_H;
/** Dots live left of this x; KDE strip is to the right. */
const DOT_ZONE_RIGHT = 76;
const DOT_CENTER_X = 36;
const DOT_JITTER_MAX = 24;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

type DragHandle = "low" | "high" | null;

export function TemperaturePanel() {
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
    () => buildKdePaths(centerTemps, PLOT_H, PLOT_W, DOT_ZONE_RIGHT),
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

  const yLow = tempToY(filterLow, TRACK_H);
  const yHigh = tempToY(filterHigh, TRACK_H);
  const activeTop = Math.min(yLow, yHigh);
  const activeH = Math.abs(yHigh - yLow);

  const tickLabels = [100, 75, 50, 25, 0, -10];

  return (
    <section className="landing-panel landing-panel-top landing-temperature-panel">
      <h2 className="panel-title">Panel 2</h2>
      <div className="panel-content temperature-panel-content">
        <div className="temperature-panel-plot">
          <svg
            className="temperature-distribution-svg"
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            width="100%"
            height={PLOT_H}
            role="img"
            aria-label="Paper count distribution by study temperature (midpoint of each paper range), with density curve"
          >
            <defs>
              <linearGradient
                id="temperature-kde-fill"
                gradientUnits="userSpaceOnUse"
                x1={DOT_ZONE_RIGHT}
                y1={0}
                x2={PLOT_W}
                y2={0}
              >
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <rect
              width={PLOT_W}
              height={PLOT_H}
              fill="#0f172a"
              rx={4}
            />
            <path
              d={kdePaths.areaD}
              className="temperature-kde-area"
              fill="url(#temperature-kde-fill)"
            />
            <path
              d={kdePaths.lineD}
              className="temperature-kde-line"
              fill="none"
            />
            {papers.map((p, i) => {
              const mid = (p.minC + p.maxC) / 2;
              const cy = tempToY(mid, PLOT_H);
              const active = rangeOverlapsFilter(
                p.minC,
                p.maxC,
                filterLow,
                filterHigh,
              );
              const rawX =
                DOT_CENTER_X +
                jitter11(hashId(p.id), i) * DOT_JITTER_MAX;
              const cx = Math.min(
                DOT_ZONE_RIGHT - 6,
                Math.max(8, rawX),
              );
              return (
                <circle
                  key={p.id}
                  cx={cx}
                  cy={cy}
                  r={1.75}
                  fill={tempToCoolWarmColor(mid)}
                  fillOpacity={active ? 0.88 : 0.22}
                />
              );
            })}
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
            <button
              type="button"
              className="temperature-slider-handle temperature-slider-handle-low"
              style={{ top: yLow - 10 }}
              aria-label={`Minimum temperature ${Math.round(filterLow)} degrees Celsius`}
              onPointerDown={(e) => {
                e.preventDefault();
                dragRef.current = "low";
                document.body.style.cursor = "grabbing";
              }}
            />
            <button
              type="button"
              className="temperature-slider-handle temperature-slider-handle-high"
              style={{ top: yHigh - 10 }}
              aria-label={`Maximum temperature ${Math.round(filterHigh)} degrees Celsius`}
              onPointerDown={(e) => {
                e.preventDefault();
                dragRef.current = "high";
                document.body.style.cursor = "grabbing";
              }}
            />
          </div>
          <div
            className="temperature-slider-ticks"
            style={{ height: TRACK_H }}
          >
            {tickLabels.map((t) => (
              <span
                key={t}
                className="temperature-slider-tick"
                style={{
                  top: tempToY(t, TRACK_H) - 6,
                }}
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
