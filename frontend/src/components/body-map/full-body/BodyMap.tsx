import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type PointerEvent,
} from "react";
import type { ContourMultiPolygon } from "d3-contour";
import { BODY_MAP_VIEW, getBodyMapOutlinePathD } from "../bodyMapOutlinePath";
import {
  getBodySilhouetteAsset,
  loadBodySilhouetteAsset,
} from "../bodyMapSilhouetteAsset";
import type { BodyMapVariant } from "../bodyMapVariant";
import {
  heatmapContrastT,
  interpolatePinkDensityTone,
} from "../shared/bodyMapHeatmapColors";
import { BodyMapHeatmapLegend } from "../shared/BodyMapHeatmapLegend";
import {
  buildBodyMapAreaDensityContoursByPart,
  createBodyMapAreaContourGeoPath,
  maxContourValueFromLayers,
} from "./bodyMapAreaContours";
import {
  countToPerceptualNormalized,
  getRegionCountForBodyMapPart,
} from "../bodyMapVisualization";
import {
  bodyMapParentHasChipSelection,
  type BodyMapChipSelection,
} from "@/lib/research/bodyMapChipSelection";
import {
  WHOLE_BODY_GENERAL_COUNT_KEY,
  type BodyMapParentRegion,
  type BodyMapRegion,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import { REQUIRE_DOTS_INSIDE_BODY_OUTLINE } from "../bodyMapSampleDots";
import { type FullBodyMapPart, useBodyMapPartDots } from "./useBodyMapPartDots";

/**
 * Full-body map (Level 1 only in this file).
 *
 * - Part geometry is parsed from `public/body-map/body-silhouette-parts.svg` (see `bodyMapSilhouetteAsset.ts`).
 * - Level 2 zoomed SVG + fine hit targets will live in a separate component later; filtering hooks already exist
 *   on context (`selectedBodyMapChips` + `BodyMapSelection.selectedChips`).
 */
type TooltipState = { label: string; count: number; x: number; y: number };

const HEATMAP_DOT_RADIUS = 75;
const HEATMAP_DOT_OPACITY_MIN = 0.12;
const HEATMAP_DOT_OPACITY_MAX = 0.32;

/** Inner `g` translate (path data + clip live in this space). */
const BODY_MAP_INNER_TX = 0;

const BODY_MAP_SCALE_PIVOT_OX = 418.7415;
const BODY_MAP_SCALE_PIVOT_OY = 909.6845;
const BODY_MAP_CONTENT_SCALE_X = 1.04;
const BODY_MAP_CONTENT_SCALE_Y = 1;

const BODY_MAP_UNIFORM_SCALE_TRANSFORM = `translate(${BODY_MAP_SCALE_PIVOT_OX} ${BODY_MAP_SCALE_PIVOT_OY}) scale(${BODY_MAP_CONTENT_SCALE_X} ${BODY_MAP_CONTENT_SCALE_Y}) translate(${-BODY_MAP_SCALE_PIVOT_OX} ${-BODY_MAP_SCALE_PIVOT_OY})`;

type BodyPart = FullBodyMapPart;

/**
 * Z-order for interactive silhouette paths only (later = higher = receives pointer first).
 * Default asset order is head…arm, wrist, hand — the hand fill overlaps the wrist band, so
 * wrist was nearly impossible to pick. Rendering distal bands after neighboring parts fixes that
 * (same idea for ankle vs foot).
 */
const BODY_MAP_HIT_TARGET_ORDER: readonly BodyMapRegion[] = [
  "head",
  "neck",
  "torso",
  "arm",
  "leg",
  "hand",
  "foot",
  "wrist",
  "ankle",
];

function buildBodyPartsForHitTargets(bodyParts: BodyPart[]): BodyPart[] {
  const byId = new Map(bodyParts.map((p) => [p.id, p]));
  const ordered = BODY_MAP_HIT_TARGET_ORDER.map((id) => byId.get(id)).filter(
    (p): p is BodyPart => p != null,
  );
  const seen = new Set(ordered.map((p) => p.id));
  for (const p of bodyParts) {
    if (!seen.has(p.id)) ordered.push(p);
  }
  return ordered;
}

type BodyMapProps = {
  paperCountsByPart?: Record<string, number>;
  /**
   * Papers in the current filter; Dot view places one dot per body-site hit (bilateral unspecified → distributed L/R).
   */
  heatmapDotPapers?: readonly ResearchPaper[];
  /**
   * Full-dataset region counts used only for the fixed heatmap colour domain and legend.
   * When omitted, `paperCountsByPart` is used (e.g. static view without filter context).
   */
  heatmapScaleReferenceCounts?: Record<string, number>;
  variant?: BodyMapVariant;
  /** Chip selections — L1 parents highlighted when any chip targets that parent. */
  selectedBodyMapChips?: readonly BodyMapChipSelection[];
  onPartClick?: (region: BodyMapParentRegion) => void;
};

export function BodyMap({
  paperCountsByPart = {},
  heatmapDotPapers,
  heatmapScaleReferenceCounts,
  variant = "countHeatmap",
  selectedBodyMapChips = [],
  onPartClick,
}: BodyMapProps) {
  const isRegionChipSelected = useCallback(
    (region: BodyMapParentRegion) =>
      bodyMapParentHasChipSelection(selectedBodyMapChips, region),
    [selectedBodyMapChips],
  );
  const isWholeBodyChipSelected = useCallback(
    () => isRegionChipSelected("wholeBody"),
    [isRegionChipSelected],
  );
  const uid = useId().replace(/:/g, "");
  const clipPathId = `body-map-silhouette-${uid}`;
  const wholeBodyRingMaskId = `body-map-wb-ring-mask-${uid}`;
  const hoverGradientId = `body-map-hover-sky-${uid}`;
  const softFillFilterId = `body-map-soft-fill-${uid}`;
  const heatLegendGradientId = `body-map-heat-legend-${uid}`;
  const heatDotRadialGradientId = `body-map-heat-dot-radial-${uid}`;
  const rawDotsLegendGradientId = `body-map-raw-dots-legend-${uid}`;
  const rawDotsSoftBlurId = `body-map-raw-dots-soft-blur-${uid}`;
  const wholeBodyRingGlowFilterId = `body-map-wb-ring-glow-${uid}`;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [silhouetteStatus, setSilhouetteStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [silhouetteErrorMsg, setSilhouetteErrorMsg] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    loadBodySilhouetteAsset()
      .then(() => {
        if (!cancelled) setSilhouetteStatus("ready");
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSilhouetteStatus("error");
          setSilhouetteErrorMsg(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const bodyParts = useMemo((): BodyPart[] => {
    if (silhouetteStatus !== "ready") return [];
    return getBodySilhouetteAsset().parts as BodyPart[];
  }, [silhouetteStatus]);

  const bodyPartsForHitTargets = useMemo(
    () => buildBodyPartsForHitTargets(bodyParts),
    [bodyParts],
  );

  const outlinePathD = useMemo(
    () => (silhouetteStatus === "ready" ? getBodyMapOutlinePathD() : ""),
    [silhouetteStatus],
  );

  const paperCountsKey = useMemo(
    () => JSON.stringify(paperCountsByPart),
    [paperCountsByPart],
  );

  const heatmapPaperIdsKey = useMemo(
    () => (heatmapDotPapers ?? []).map((p) => p.id).join("\0"),
    [heatmapDotPapers],
  );

  const dotsByPartId = useBodyMapPartDots({
    variant,
    bodyParts,
    heatmapDotPapers,
    paperCountsKey,
    heatmapPaperIdsKey,
  });

  const wholeBodyGeneralPaperCount = useMemo(() => {
    const raw = JSON.parse(paperCountsKey) as Record<string, number>;
    return getRegionCountForBodyMapPart(WHOLE_BODY_GENERAL_COUNT_KEY, raw);
  }, [paperCountsKey]);

  const partPaperMap = useMemo(() => {
    const raw = JSON.parse(paperCountsKey) as Record<string, number>;
    const m: Record<string, number> = {};
    for (const p of bodyParts) {
      m[p.id] = getRegionCountForBodyMapPart(p.id, raw);
    }
    return m;
  }, [paperCountsKey, bodyParts]);

  const rawForGlobalHeatmapScale =
    heatmapScaleReferenceCounts ?? paperCountsByPart;

  const countColorDomain = useMemo<[number, number]>(() => {
    const maxVal = Math.max(
      0,
      ...bodyParts.map((part) =>
        getRegionCountForBodyMapPart(part.id, rawForGlobalHeatmapScale),
      ),
    );
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [rawForGlobalHeatmapScale, bodyParts]);

  const wholeBodySilhouetteTint = useMemo(() => {
    if (wholeBodyGeneralPaperCount <= 0) return null;
    const t = countToPerceptualNormalized(
      wholeBodyGeneralPaperCount,
      countColorDomain,
    );
    const tAdj = heatmapContrastT(t);
    return {
      fill: interpolatePinkDensityTone(tAdj * 0.72),
      fillOpacity: 0.055 + 0.2 * tAdj,
    };
  }, [wholeBodyGeneralPaperCount, countColorDomain]);

  const rawDotsContoursByPart = useMemo<
    { partId: BodyMapRegion; contours: ContourMultiPolygon[] }[]
  >(() => {
    if (variant !== "rawDots") return [];
    return buildBodyMapAreaDensityContoursByPart(bodyParts, dotsByPartId);
  }, [dotsByPartId, variant, bodyParts]);
  const rawDotsGlobalContourMaxValue = useMemo(
    () => maxContourValueFromLayers(rawDotsContoursByPart),
    [rawDotsContoursByPart],
  );
  const rawDotsContourPath = useMemo(
    () => createBodyMapAreaContourGeoPath(),
    [],
  );

  const wholeBodyOutlineActive =
    hoveredPartId === WHOLE_BODY_GENERAL_COUNT_KEY ||
    isWholeBodyChipSelected();

  const wholeBodyRingHovered = hoveredPartId === WHOLE_BODY_GENERAL_COUNT_KEY;

  /** Thick masked ring: stay visible while whole body is selected, not only on hover. */
  const wholeBodyHitRingVisible =
    wholeBodyRingHovered || isWholeBodyChipSelected();

  const clearPointerHover = useCallback(() => {
    setHoveredPartId(null);
    setTooltip(null);
  }, []);

  const handleWholeBodyRingEnter = useCallback(
    (e: PointerEvent<SVGPathElement>) => {
      setHoveredPartId(WHOLE_BODY_GENERAL_COUNT_KEY);
      setTooltip({
        label: "General",
        count: wholeBodyGeneralPaperCount,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [wholeBodyGeneralPaperCount],
  );

  const handleWholeBodyRingClick = useCallback(() => {
    onPartClick?.("wholeBody");
  }, [onPartClick]);

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

  const handlePartLeave = clearPointerHover;

  const handlePartClick = useCallback(
    (part: BodyPart) => {
      return () => {
        onPartClick?.(part.id);
      };
    },
    [onPartClick],
  );

  const ariaLabel =
    variant === "countHeatmap"
      ? "Body map: smooth density heatmap — overlapping dots encode paper concentration per region on a fixed full-dataset scale; whole-body general studies use a full-silhouette tint instead of regional dots; hover regions or the outer figure outline for counts, including whole-body (general)."
      : "Body map: area view draws placement-aware density (e.g. forearm vs upper arm) from filtered papers, then smooths it for display; whole-body general studies use a full-silhouette tint instead of regional dots; hover regions or the outer figure outline for whole-body (general) counts.";
  const mapTransform = BODY_MAP_UNIFORM_SCALE_TRANSFORM;
  const activeView = BODY_MAP_VIEW;
  const activeClipPath = `url(#${clipPathId})`;
  const clipDotsToOutline = REQUIRE_DOTS_INSIDE_BODY_OUTLINE;

  return (
    <div className="body-map-root">
      <div className="body-map-svg-wrap">
        {silhouetteStatus === "loading" ? (
          <p className="body-map-loading">Loading body map…</p>
        ) : null}
        {silhouetteStatus === "error" ? (
          <p className="body-map-error" role="alert">
            {silhouetteErrorMsg ?? "Could not load body map SVG."}
          </p>
        ) : null}
        {silhouetteStatus === "ready" ? (
          <svg
            className="body-map-svg"
            width="100%"
            height="100%"
            viewBox={`${activeView.x} ${activeView.y} ${activeView.w} ${activeView.h}`}
            preserveAspectRatio="xMidYMin meet"
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
                <feGaussianBlur in="SourceGraphic" stdDeviation="6.8" />
              </filter>
              <filter
                id={rawDotsSoftBlurId}
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
              </filter>
              <filter
                id={wholeBodyRingGlowFilterId}
                x="-100%"
                y="-100%"
                width="300%"
                height="300%"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="5.5"
                  result="wbRingBlur"
                />
                <feMerge>
                  <feMergeNode in="wbRingBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient
                id={heatDotRadialGradientId}
                gradientUnits="objectBoundingBox"
                cx="0.5"
                cy="0.5"
                r="0.5"
              >
                <stop offset="0%" stopColor="#be185d" stopOpacity="1" />
                <stop offset="38%" stopColor="#db2777" stopOpacity="0.72" />
                <stop offset="72%" stopColor="#fb7185" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#ffe4e6" stopOpacity="0" />
              </radialGradient>
              <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
                <path
                  transform={`translate(${BODY_MAP_INNER_TX})`}
                  d={outlinePathD}
                />
              </clipPath>
              <mask
                id={wholeBodyRingMaskId}
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                x={BODY_MAP_VIEW.x}
                y={BODY_MAP_VIEW.y}
                width={BODY_MAP_VIEW.w}
                height={BODY_MAP_VIEW.h}
              >
                <rect
                  x={BODY_MAP_VIEW.x}
                  y={BODY_MAP_VIEW.y}
                  width={BODY_MAP_VIEW.w}
                  height={BODY_MAP_VIEW.h}
                  fill="white"
                />
                <path
                  transform={`translate(${BODY_MAP_INNER_TX})`}
                  d={outlinePathD}
                  fill="black"
                />
              </mask>
            </defs>

            <g transform={mapTransform}>
              <g clipPath={activeClipPath}>
                <rect
                  x={BODY_MAP_VIEW.x}
                  y={BODY_MAP_VIEW.y}
                  width={BODY_MAP_VIEW.w}
                  height={BODY_MAP_VIEW.h}
                  fill="transparent"
                />
                <path
                  transform={`translate(${BODY_MAP_INNER_TX})`}
                  d={outlinePathD}
                  fill="transparent"
                  pointerEvents="none"
                />
                <g id="layer1" transform={`translate(${BODY_MAP_INNER_TX})`}>
                  {wholeBodySilhouetteTint ? (
                    <path
                      d={outlinePathD}
                      fill={wholeBodySilhouetteTint.fill}
                      fillOpacity={wholeBodySilhouetteTint.fillOpacity}
                      stroke="none"
                      pointerEvents="none"
                    />
                  ) : null}
                  {bodyPartsForHitTargets.flatMap((part) =>
                    part.subpaths.map((sp, i) => (
                      <path
                        key={`${part.id}-hit-${i}`}
                        id={`${part.id}-hit-${i}`}
                        d={sp.d}
                        transform={sp.transform}
                        fill={
                          hoveredPartId === part.id ||
                          isRegionChipSelected(part.id)
                            ? `url(#${hoverGradientId})`
                            : "transparent"
                        }
                        fillOpacity={
                          hoveredPartId === part.id ||
                          isRegionChipSelected(part.id)
                            ? 0.78
                            : 1
                        }
                        filter={
                          hoveredPartId === part.id ||
                          isRegionChipSelected(part.id)
                            ? `url(#${softFillFilterId})`
                            : undefined
                        }
                        stroke="none"
                        pointerEvents="all"
                        style={{ cursor: "pointer" }}
                        onPointerEnter={handlePartEnter(part)}
                        onPointerMove={handlePartMove}
                        onPointerLeave={handlePartLeave}
                        onClick={handlePartClick(part)}
                      />
                    )),
                  )}
                </g>
              </g>

              <g
                className="body-map-dots-layer"
                transform={`translate(${BODY_MAP_INNER_TX})`}
                clipPath={clipDotsToOutline ? activeClipPath : undefined}
                pointerEvents="none"
              >
                {variant === "countHeatmap" ? (
                  <g>
                    {bodyParts.flatMap((part) => {
                      const c = partPaperMap[part.id] ?? 0;
                      const t = countToPerceptualNormalized(
                        c,
                        countColorDomain,
                      );
                      const tAdj = heatmapContrastT(t);
                      const dots = dotsByPartId[part.id] ?? [];
                      const opacity =
                        HEATMAP_DOT_OPACITY_MIN +
                        (HEATMAP_DOT_OPACITY_MAX - HEATMAP_DOT_OPACITY_MIN) *
                          tAdj;
                      return dots.map((p, i) => (
                        <circle
                          key={`heat-single-${part.id}-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={HEATMAP_DOT_RADIUS}
                          fill={`url(#${heatDotRadialGradientId})`}
                          fillOpacity={opacity}
                        />
                      ));
                    })}
                  </g>
                ) : null}
                {variant === "rawDots" ? (
                  <g filter={`url(#${rawDotsSoftBlurId})`}>
                    {rawDotsContoursByPart.flatMap((entry) => {
                      const partCount = partPaperMap[entry.partId] ?? 0;
                      const countStrength = countToPerceptualNormalized(
                        partCount,
                        countColorDomain,
                      );
                      const countBoost =
                        0.35 + Math.pow(countStrength, 0.9) * 0.65;
                      const globalMax =
                        rawDotsGlobalContourMaxValue <= 0
                          ? 1
                          : rawDotsGlobalContourMaxValue;
                      return entry.contours.map(
                        (contour: ContourMultiPolygon, i: number) => {
                          const d = rawDotsContourPath(contour);
                          if (!d) return null;
                          const value = contour.value ?? 0;
                          const normalized = Math.min(
                            1,
                            Math.max(0, value / globalMax),
                          );
                          const contrastAdjusted = Math.pow(normalized, 1.7);
                          const opacity =
                            (0.015 + contrastAdjusted * 0.9) * countBoost;
                          return (
                            <path
                              key={`raw-density-${entry.partId}-${i}`}
                              d={d}
                              fill="#db2777"
                              fillOpacity={opacity}
                              stroke="none"
                            />
                          );
                        },
                      );
                    })}
                    {rawDotsContoursByPart.length === 0
                      ? bodyParts.flatMap((part) => {
                          const dots = dotsByPartId[part.id] ?? [];
                          return dots.map((p, i) => (
                            <circle
                              key={`raw-fallback-dot-${part.id}-${i}`}
                              cx={p.x}
                              cy={p.y}
                              r={3.8}
                              fill="#db2777"
                              fillOpacity={0.42}
                            />
                          ));
                        })
                      : null}
                  </g>
                ) : null}
              </g>

              <g
                transform={`translate(${BODY_MAP_INNER_TX})`}
                pointerEvents="auto"
              >
                <path
                  d={outlinePathD}
                  fill="none"
                  stroke={wholeBodyHitRingVisible ? "#fbcfe8" : "transparent"}
                  strokeOpacity={
                    wholeBodyRingHovered
                      ? 0.88
                      : wholeBodyHitRingVisible
                        ? 0.52
                        : 1
                  }
                  strokeWidth={40}
                  vectorEffect="nonScalingStroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="stroke"
                  mask={`url(#${wholeBodyRingMaskId})`}
                  filter={
                    wholeBodyRingHovered
                      ? `url(#${wholeBodyRingGlowFilterId})`
                      : undefined
                  }
                  style={{ cursor: "pointer" }}
                  onPointerEnter={handleWholeBodyRingEnter}
                  onPointerMove={handlePartMove}
                  onPointerLeave={handlePartLeave}
                  onClick={handleWholeBodyRingClick}
                  aria-label="Whole body (general) paper count along the figure outline"
                />
                <path
                  d={outlinePathD}
                  fill="none"
                  stroke={wholeBodyOutlineActive ? "#db2777" : "#1e293b"}
                  strokeOpacity={wholeBodyOutlineActive ? 0.82 : 0.65}
                  strokeWidth={1.1}
                  vectorEffect="nonScalingStroke"
                  shapeRendering="geometricPrecision"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              </g>
            </g>
          </svg>
        ) : null}
      </div>

      {silhouetteStatus === "ready" ? (
        <BodyMapHeatmapLegend
          variant={variant}
          colorDomain={countColorDomain}
          gradientId={
            variant === "countHeatmap"
              ? heatLegendGradientId
              : rawDotsLegendGradientId
          }
          caption={
            variant === "countHeatmap"
              ? `Paper density (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()} papers. Hover regions or the outer outline for counts (outline shows whole-body general).`
              : `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Dots use d3 density smoothing for visual clustering. Hover the outline for whole-body (general).`
          }
        />
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
