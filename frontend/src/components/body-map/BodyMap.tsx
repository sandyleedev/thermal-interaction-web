import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type PointerEvent,
} from "react";
import {
  BODY_MAP_OUTLINE_PATH_D,
  BODY_MAP_VIEW,
} from "./bodyMapOutlinePath";
import { type BodySubpath } from "./bodyMapSampleDots";
import { DEFAULT_PAPER_COUNTS } from "./bodyMapMockData";
import {
  buildGlobalHeatmapScaleFromFullDatasetCounts,
  countToPerceptualNormalized,
  generateDotsForRegion,
  getRegionCountForBodyMapPart,
  mapCountToColor,
} from "./bodyMapVisualization";

type TooltipState = { label: string; count: number; x: number; y: number };

const BODY_MAP_DOT_FILL = "#fda4af";
const BODY_MAP_DOT_FILL_OPACITY = 0.35;
const BODY_MAP_DOT_RADIUS = 1.25;

/** Inner `g` translate (path data + clip live in this space). */
const BODY_MAP_INNER_TX = -59.365521;

const BODY_MAP_SCALE_PIVOT_OX = 44.2;
const BODY_MAP_SCALE_PIVOT_OY = 101;
const BODY_MAP_CONTENT_SCALE = 1.12;

const BODY_MAP_UNIFORM_SCALE_TRANSFORM = `translate(${BODY_MAP_SCALE_PIVOT_OX} ${BODY_MAP_SCALE_PIVOT_OY}) scale(${BODY_MAP_CONTENT_SCALE}) translate(${-BODY_MAP_SCALE_PIVOT_OX} ${-BODY_MAP_SCALE_PIVOT_OY})`;

type BodyPart = {
  id: string;
  label: string;
  subpaths: BodySubpath[];
};

const BODY_PARTS: BodyPart[] = [
  {
    id: "head",
    label: "Head",
    subpaths: [
      {
        d: "M 115.76117,14.952482 A 12.299625,14.952485 0 0 1 103.46155,29.904967 12.299625,14.952485 0 0 1 91.161922,14.952482 12.299625,14.952485 0 0 1 103.46155,-2.8610229e-6 12.299625,14.952485 0 0 1 115.76117,14.952482 Z",
      },
    ],
  },
  {
    id: "torso",
    label: "Torso",
    subpaths: [
      {
        d: "M 85.0 32.799 H 120.102 C 120.35 52 120.0 72 118.8 88 C 117.8 96 116.2 101 113.5 103.5 C 110.5 104.8 106 105.2 102.5 105 C 99 105.2 94.5 104.5 91.5 103.5 C 88.8 101 87.2 96 86.2 88 C 85.5 78 85.1 52 85.0 32.799 Z",
      },
    ],
  },
  {
    id: "arms",
    label: "Arms",
    subpaths: [
      {
        transform: "rotate(12.503308)",
        d: "m 90.71978,14.939092 h 0.736908 c 3.99404,0 7.209458,2.904158 7.209458,6.511566 v 54.54158 c 0,3.607408 -3.215418,6.511566 -7.209458,6.511566 H 90.71978 c -3.994039,0 -7.209457,-2.904158 -7.209457,-6.511566 v -54.54158 c 0,-3.607408 3.215418,-6.511566 7.209457,-6.511566 z",
      },
      {
        transform: "rotate(-11.24316)",
        d: "m 112.87561,56.518188 h 0.73691 c 3.99404,0 7.20946,2.904159 7.20946,6.511567 v 54.541575 c 0,3.60741 -3.21542,6.51157 -7.20946,6.51157 h -0.73691 c -3.99404,0 -7.20946,-2.90416 -7.20946,-6.51157 V 63.029755 c 0,-3.607408 3.21542,-6.511567 7.20946,-6.511567 z",
      },
    ],
  },
  {
    id: "legs",
    label: "Legs",
    subpaths: [
      {
        transform: "matrix(0.99812088,0.06127571,0.01525473,0.99988364,0,0)",
        d: "m 89.010947,88.5 h 1.061756 c 5.75472,0 10.387577,3.48197 10.387577,7.80711 v 78.39312 c 0,4.32514 -4.632857,7.8071 -10.387577,7.8071 h -1.061756 c -5.754719,0 -10.38758,-3.48196 -10.38758,-7.8071 v -78.39312 c 0,-4.32514 4.632861,-7.80711 10.38758,-7.80711 z",
      },
      {
        transform: "matrix(0.99812088,0.06127571,0.01525473,0.99988364,0,0)",
        d: "m 112.33839,87.263 h 1.06176 c 5.75472,0 10.38758,3.48197 10.38758,7.8071 v 78.39313 c 0,4.32514 -4.63286,7.8071 -10.38758,7.8071 h -1.06176 c -5.75472,0 -10.38758,-3.48196 -10.38758,-7.8071 V 95.0801 c 0,-4.32513 4.63286,-7.8071 10.38758,-7.8071 z",
      },
    ],
  },
  {
    id: "hands",
    label: "Hands",
    subpaths: [
      {
        transform: "matrix(0.99969357,0.02475428,0.0377978,0.99928541,0,0)",
        d: "m 63.14005,97.228271 h 0.768476 c 4.165151,0 7.518323,1.018716 7.518323,2.284117 v 19.132002 c 0,1.2654 -3.353172,2.28411 -7.518323,2.28411 H 63.14005 c -4.165151,0 -7.518323,-1.01871 -7.518323,-2.28411 V 99.512388 c 0,-1.265401 3.353172,-2.284117 7.518323,-2.284117 z",
      },
      {
        transform: "matrix(0.99969357,0.02475428,0.0377978,0.99928541,0,0)",
        d: "m 135.30823,95.196106 h 0.76848 c 4.16515,0 7.51832,1.018716 7.51832,2.284116 v 19.131998 c 0,1.2654 -3.35317,2.28412 -7.51832,2.28412 h -0.76848 c -4.16515,0 -7.51832,-1.01872 -7.51832,-2.28412 V 97.480222 c 0,-1.2654 3.35317,-2.284116 7.51832,-2.284116 z",
      },
    ],
  },
  {
    id: "feet",
    label: "Feet",
    subpaths: [
      {
        transform: "matrix(0.99978513,0.02072885,0.04512831,0.9989812,0,0)",
        d: "m 85.760105,185.75214 h 0.768405 c 4.164769,0 7.517634,0.85323 7.517634,1.91309 v 16.02425 c 0,1.05985 -3.352865,1.91309 -7.517634,1.91309 h -0.768405 c -4.16477,0 -7.517635,-0.85324 -7.517635,-1.91309 v -16.02425 c 0,-1.05986 3.352865,-1.91309 7.517635,-1.91309 z",
      },
      {
        transform: "matrix(0.99978513,0.02072885,0.04512831,0.9989812,0,0)",
        d: "m 103.12097,185.35567 h 0.7684 c 4.16477,0 7.51764,0.85324 7.51764,1.91309 v 16.02425 c 0,1.05986 -3.35287,1.91309 -7.51764,1.91309 h -0.7684 c -4.164772,0 -7.517637,-0.85323 -7.517637,-1.91309 v -16.02425 c 0,-1.05985 3.352865,-1.91309 7.517637,-1.91309 z",
      },
    ],
  },
];

export type BodyMapVariant = "countHeatmap" | "rawDots";

type BodyMapProps = {
  paperCountsByPart?: Record<string, number>;
  /**
   * Full-dataset region counts used only for the fixed heatmap colour domain and legend.
   * When omitted, `paperCountsByPart` is used (e.g. static mock without filter context).
   */
  heatmapScaleReferenceCounts?: Record<string, number>;
  variant?: BodyMapVariant;
};

/** Softer glow spread (sqrt-normalized); matches earlier soft-blurred heatmap look. */
function heatmapRegionFillOpacity(perceptualT: number): number {
  return Math.min(1, 0.14 + perceptualT * 0.78);
}

export function BodyMap({
  paperCountsByPart = DEFAULT_PAPER_COUNTS,
  heatmapScaleReferenceCounts,
  variant = "countHeatmap",
}: BodyMapProps) {
  const uid = useId().replace(/:/g, "");
  const clipPathId = `body-map-silhouette-${uid}`;
  const hoverGradientId = `body-map-hover-sky-${uid}`;
  const softFillFilterId = `body-map-soft-fill-${uid}`;
  const heatmapBlurId = `body-map-heat-blur-${uid}`;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [dotsByPartId, setDotsByPartId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});

  const paperCountsKey = useMemo(
    () => JSON.stringify(paperCountsByPart),
    [paperCountsByPart],
  );

  const partPaperMap = useMemo(() => {
    const raw = JSON.parse(paperCountsKey) as Record<string, number>;
    const m: Record<string, number> = {};
    for (const p of BODY_PARTS) {
      m[p.id] = getRegionCountForBodyMapPart(p.id, raw);
    }
    return m;
  }, [paperCountsKey]);

  const rawForGlobalHeatmapScale =
    heatmapScaleReferenceCounts ?? paperCountsByPart;

  const { colorDomain: countColorDomain, legendItems: heatmapColorLegend } =
    useMemo(
      () =>
        buildGlobalHeatmapScaleFromFullDatasetCounts(rawForGlobalHeatmapScale),
      [rawForGlobalHeatmapScale],
    );

  useLayoutEffect(() => {
    let cancelled = false;
    if (variant !== "rawDots") {
      queueMicrotask(() => {
        if (!cancelled) setDotsByPartId({});
      });
      return () => {
        cancelled = true;
      };
    }
    const counts = JSON.parse(paperCountsKey) as Record<string, number>;
    const next: Record<string, { x: number; y: number }[]> = {};
    for (const part of BODY_PARTS) {
      const papers = getRegionCountForBodyMapPart(part.id, counts);
      next[part.id] = generateDotsForRegion(part.subpaths, papers);
    }
    queueMicrotask(() => {
      if (!cancelled) setDotsByPartId(next);
    });
    return () => {
      cancelled = true;
    };
  }, [paperCountsKey, variant]);

  const handlePartEnter = useCallback(
    (part: BodyPart) => {
      return (e: PointerEvent<SVGPathElement>) => {
        setHoveredPartId(part.id);
        setTooltip({
          label: part.label,
          count: partPaperMap[part.id] ?? 0,
          x: e.clientX,
          y: e.clientY,
        });
      };
    },
    [partPaperMap],
  );

  const handlePartMove = useCallback((e: PointerEvent<SVGPathElement>) => {
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
    );
  }, []);

  const handlePartLeave = useCallback(() => {
    setHoveredPartId(null);
    setTooltip(null);
  }, []);

  const ariaLabel =
    variant === "countHeatmap"
      ? "Body map: soft heatmap — colour encodes paper count per region on a fixed full-dataset scale (square root); tooltip shows exact counts for the current filter."
      : "Body map: one dot per paper, placed randomly within each body region.";

  return (
    <div className="body-map-root">
      <div className="body-map-svg-wrap">
        <svg
          className="body-map-svg"
          width="100%"
          height="100%"
          viewBox={`${BODY_MAP_VIEW.x} ${BODY_MAP_VIEW.y} ${BODY_MAP_VIEW.w} ${BODY_MAP_VIEW.h}`}
          preserveAspectRatio="xMidYMax meet"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient
              id={hoverGradientId}
              gradientUnits="userSpaceOnUse"
              x1={10}
              y1={BODY_MAP_VIEW.y}
              x2={78}
              y2={BODY_MAP_VIEW.y + BODY_MAP_VIEW.h}
            >
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity={0.75} />
              <stop offset="50%" stopColor="#bae6fd" stopOpacity={0.65} />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.55} />
            </linearGradient>
            <filter
              id={softFillFilterId}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" />
            </filter>
            <filter
              id={heatmapBlurId}
              x="-65%"
              y="-65%"
              width="230%"
              height="230%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="7.2" />
            </filter>
            <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
              <path
                transform={`translate(${BODY_MAP_INNER_TX})`}
                d={BODY_MAP_OUTLINE_PATH_D}
              />
            </clipPath>
          </defs>

          <g transform={BODY_MAP_UNIFORM_SCALE_TRANSFORM}>
            <g clipPath={`url(#${clipPathId})`}>
              <rect
                x={BODY_MAP_VIEW.x}
                y={BODY_MAP_VIEW.y}
                width={BODY_MAP_VIEW.w}
                height={BODY_MAP_VIEW.h}
                fill="#0f172a"
              />
              <g
                id="layer1"
                transform={`translate(${BODY_MAP_INNER_TX})`}
                style={
                  variant === "countHeatmap"
                    ? { mixBlendMode: "screen" }
                    : undefined
                }
              >
                {variant === "countHeatmap" ? (
                  <g filter={`url(#${heatmapBlurId})`} pointerEvents="none">
                    {BODY_PARTS.flatMap((part) => {
                      const c = partPaperMap[part.id] ?? 0;
                      const t = countToPerceptualNormalized(c, countColorDomain);
                      const fill = mapCountToColor(c, countColorDomain);
                      const fillOpacity = heatmapRegionFillOpacity(t);
                      return part.subpaths.map((sp, i) => (
                        <path
                          key={`heat-count-${part.id}-${i}`}
                          d={sp.d}
                          transform={sp.transform}
                          fill={fill}
                          fillOpacity={fillOpacity}
                        />
                      ));
                    })}
                  </g>
                ) : null}
                {variant === "rawDots"
                  ? BODY_PARTS.flatMap((part) => {
                      const dots = dotsByPartId[part.id] ?? [];
                      return dots.map((p, i) => (
                        <circle
                          key={`${part.id}-dot-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={BODY_MAP_DOT_RADIUS}
                          fill={BODY_MAP_DOT_FILL}
                          fillOpacity={BODY_MAP_DOT_FILL_OPACITY}
                          pointerEvents="none"
                        />
                      ));
                    })
                  : null}
                {BODY_PARTS.flatMap((part) =>
                  part.subpaths.map((sp, i) => (
                    <path
                      key={`${part.id}-hit-${i}`}
                      id={`${part.id}-hit-${i}`}
                      d={sp.d}
                      transform={sp.transform}
                      fill={
                        hoveredPartId === part.id
                          ? `url(#${hoverGradientId})`
                          : "transparent"
                      }
                      fillOpacity={hoveredPartId === part.id ? 0.78 : 1}
                      filter={
                        hoveredPartId === part.id
                          ? `url(#${softFillFilterId})`
                          : undefined
                      }
                      stroke="none"
                      pointerEvents="all"
                      style={{ cursor: "pointer" }}
                      onPointerEnter={handlePartEnter(part)}
                      onPointerMove={handlePartMove}
                      onPointerLeave={handlePartLeave}
                    />
                  )),
                )}
              </g>
            </g>

            <g
              transform={`translate(${BODY_MAP_INNER_TX})`}
              pointerEvents="none"
            >
              <path
                d={BODY_MAP_OUTLINE_PATH_D}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={0.55}
              />
            </g>
          </g>
        </svg>
      </div>

      {variant === "countHeatmap" ? (
        <div className="body-map-heatmap-legend">
          <ul
            className="body-map-heatmap-legend-swatches"
            aria-label="Paper count ranges by colour"
          >
            {heatmapColorLegend.map((item, i) => (
              <li key={i} className="body-map-heatmap-legend-item">
                <span
                  className="body-map-heatmap-legend-swatch"
                  style={{ backgroundColor: item.color }}
                />
                <span className="body-map-heatmap-legend-label">
                  {item.rangeLabel}
                </span>
              </li>
            ))}
          </ul>
          <p className="body-map-heatmap-legend-caption">
            Legend thresholds are fixed from the full dataset (quantile bands); colours use
            the same absolute square-root scale. Hover for exact region counts.
          </p>
        </div>
      ) : null}

      {tooltip ? (
        <div
          className="body-map-tooltip"
          role="tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <div className="body-map-tooltip-title">
            {tooltip.label}: {tooltip.count.toLocaleString()} papers
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BodyMap;
