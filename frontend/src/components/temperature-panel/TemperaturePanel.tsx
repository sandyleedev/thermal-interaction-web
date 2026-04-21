import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { buildKdePaths } from "./temperaturePanelDensity";
import {
  clientYToTemp,
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
  tempToNorm,
  tempToY,
  verticalTopThumbBaseTranslateYPx,
} from "./temperaturePanelUtils";

const DEFAULT_TRACK_H = 240;
/** Tight plot width (scatter zone removed on Demo 1). */
const PLOT_W = 88;
/** KDE density strip starts just right of this x ({@link buildKdePaths}). */
const DOT_ZONE_RIGHT = 10;

type DragHandle = "low" | "high" | null;

/** Hard cap on total translateY toward the knob so the pill never stacks on the thumb after drag. */
const TOP_GEOM_THUMB_MAX_DOWN_TRANSLATE_PX = 11;

/**
 * Upper-thumb pill only gets base + panel clamp transforms; lower thumb uses stylesheet only
 * (spread) or plain translateX(-50%) so bottom behaviour stays unchanged.
 */
function verticalValuePillStyle(
  handlesClose: boolean,
  stackRole: "low" | "high",
  thumbCenterYPx: number,
  isGeometricTopThumb: boolean,
  clamp: { tx: number; ty: number },
): CSSProperties | undefined {
  const baseTy = isGeometricTopThumb
    ? verticalTopThumbBaseTranslateYPx(thumbCenterYPx)
    : 0;
  const rawTy = baseTy + (isGeometricTopThumb ? clamp.ty : 0);
  const ty = isGeometricTopThumb
    ? Math.min(rawTy, TOP_GEOM_THUMB_MAX_DOWN_TRANSLATE_PX)
    : rawTy;
  const tx = isGeometricTopThumb ? clamp.tx : 0;

  if (!isGeometricTopThumb) return undefined;

  if (handlesClose) {
    if (ty === 0 && tx === 0) return undefined;
    if (stackRole === "low") {
      return {
        transform: `translate(calc(-50% - 14px + ${tx}px), calc(-3px + ${ty}px))`,
      };
    }
    return {
      transform: `translate(calc(-50% + 14px + ${tx}px), calc(3px + ${ty}px))`,
    };
  }
  if (ty === 0 && tx === 0) return undefined;
  return {
    transform: `translate(calc(-50% + ${tx}px), ${ty}px)`,
  };
}

export type TemperaturePanelProps = {
  /**
   * Passed to the density SVG. Use `"none"` when the plot is narrower than {@link PLOT_W}px so the
   * curve still fills the track height vertically (same Y scale as the slider); default `meet` would
   * letterbox and shorten the curve.
   */
  densityPreserveAspectRatio?: string;
  /**
   * Vertical span (px) shared by the KDE plot and slider track. Default 240; Demo 3 uses a smaller value for a shorter card.
   */
  compactTrackHeightPx?: number;
  /**
   * Horizontal SVG/viewBox width for the KDE strip (default 88). Smaller values narrow the density drawing area (e.g. Demo 3).
   */
  plotWidthPx?: number;
};

export function TemperaturePanel({
  densityPreserveAspectRatio = "xMidYMid meet",
  compactTrackHeightPx,
  plotWidthPx,
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

  const trackH =
    compactTrackHeightPx !== undefined
      ? Math.min(264, Math.max(120, Math.round(compactTrackHeightPx)))
      : DEFAULT_TRACK_H;

  const plotW =
    plotWidthPx !== undefined
      ? Math.min(PLOT_W, Math.max(64, Math.round(plotWidthPx)))
      : PLOT_W;

  const kdeStripLeft = DOT_ZONE_RIGHT + 2;
  const kdeStripRight = plotW - 2;
  const kdeFlipCx = (kdeStripLeft + kdeStripRight) / 2;

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
      buildKdePaths(centerTemps, trackH, plotW, DOT_ZONE_RIGHT, {
        kdeStripInsetPx: 12,
      }),
    [centerTemps, trackH, plotW],
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

  const yLow = tempToY(filterLow, trackH);
  const yHigh = tempToY(filterHigh, trackH);
  const activeTop = Math.min(yLow, yHigh);
  const activeH = Math.abs(yHigh - yLow);

  const handlesClose =
    Math.abs(tempToNorm(filterLow) - tempToNorm(filterHigh)) < 0.14;

  /** Smaller Y = higher on screen (hot end). Only that thumb gets top-label transforms + clamp. */
  const yGeomTop = Math.min(yLow, yHigh);
  const lowIsGeomTopThumb =
    Math.abs(yLow - yGeomTop) < 0.5 &&
    (yLow < yHigh || Math.abs(yLow - yHigh) < 0.5);
  const highIsGeomTopThumb =
    Math.abs(yHigh - yGeomTop) < 0.5 && !lowIsGeomTopThumb;

  const panelRef = useRef<HTMLElement>(null);
  const topPillRef = useRef<HTMLSpanElement>(null);
  const [topPillClamp, setTopPillClamp] = useState({ tx: 0, ty: 0 });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const pill = topPillRef.current;
    if (!panel || !pill) {
      setTopPillClamp((c) =>
        c.tx === 0 && c.ty === 0 ? c : { tx: 0, ty: 0 },
      );
      return;
    }
    const pad = 6;
    const measure = () => {
      const pr = panel.getBoundingClientRect();
      const kr = pill.getBoundingClientRect();
      const titleEl = panel.querySelector(".panel-title");
      const titleBottom =
        titleEl instanceof HTMLElement
          ? titleEl.getBoundingClientRect().bottom
          : pr.top + 36;
      const belowTitleLine = titleBottom + 4;
      let tx = 0;
      let ty = 0;
      if (kr.top < pr.top + pad) {
        ty += Math.min(pr.top + pad - kr.top, 10);
      }
      if (kr.top < belowTitleLine) {
        ty += Math.min(belowTitleLine - kr.top, 10);
      }
      ty = Math.min(ty, 14);
      if (kr.left < pr.left + pad) {
        tx += pr.left + pad - kr.left;
      }
      if (kr.right > pr.right - pad) {
        tx -= kr.right - (pr.right - pad);
      }
      tx = Math.round(tx * 10) / 10;
      ty = Math.round(ty * 10) / 10;
      setTopPillClamp((prev) =>
        prev.tx === tx && prev.ty === ty ? prev : { tx, ty },
      );
    };
    measure();
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    return () => cancelAnimationFrame(id);
  }, [filterLow, filterHigh, trackH, handlesClose, yLow, yHigh]);

  const tickLabels = [100, 75, 50, 25, 0, -10];

  return (
    <section
      ref={panelRef}
      className="landing-panel landing-panel-top landing-temperature-panel"
      style={
        {
          "--temperature-panel-track-h": `${trackH}px`,
        } as CSSProperties
      }
    >
      <h2 className="panel-title">Temperature</h2>
      <div className="panel-content">
        <div className="temperature-panel-visual-wrap">
          <div className="temperature-panel-content">
            <div className="temperature-panel-plot">
              <svg
                className="temperature-distribution-svg"
                viewBox={`0 0 ${plotW} ${trackH}`}
                width="100%"
                height={trackH}
                preserveAspectRatio={densityPreserveAspectRatio}
                role="img"
                aria-label="Paper count density by study temperature (KDE curve)"
              >
                <g
                  transform={`translate(${kdeFlipCx}, 0) scale(-1, 1) translate(${-kdeFlipCx}, 0)`}
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
            style={{ height: trackH }}
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
                  height: Math.max(0, trackH - activeTop - activeH),
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
                ref={lowIsGeomTopThumb ? topPillRef : undefined}
                className={[
                  "range-slider-value-pill",
                  handlesClose && "range-slider-value-pill--spread-low",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={verticalValuePillStyle(
                  handlesClose,
                  "low",
                  yLow,
                  lowIsGeomTopThumb,
                  topPillClamp,
                )}
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
                ref={highIsGeomTopThumb ? topPillRef : undefined}
                className={[
                  "range-slider-value-pill",
                  handlesClose && "range-slider-value-pill--spread-high",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={verticalValuePillStyle(
                  handlesClose,
                  "high",
                  yHigh,
                  highIsGeomTopThumb,
                  topPillClamp,
                )}
                aria-hidden
              >
                {Math.round(filterHigh)}°C
              </span>
            </div>
          </div>
              <div
                className="temperature-slider-ticks"
                style={{ height: trackH }}
              >
                {tickLabels.map((t) => (
                  <span
                    key={t}
                    data-tick-key={t}
                    className={[
                      "temperature-slider-tick",
                      t === TEMP_AXIS_MAX &&
                        "temperature-slider-tick--axis-max",
                      t === TEMP_AXIS_MIN &&
                        "temperature-slider-tick--axis-min",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      t === TEMP_AXIS_MAX || t === TEMP_AXIS_MIN
                        ? undefined
                        : { top: tempToY(t, trackH) }
                    }
                  >
                    {t}°
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
