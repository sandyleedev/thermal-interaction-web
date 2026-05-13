import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type PointerEvent,
} from "react";
import { contourDensity, geoPath } from "d3";
import type { ContourMultiPolygon } from "d3-contour";
import { BODY_MAP_OUTLINE_PATH_D, BODY_MAP_VIEW } from "./bodyMapOutlinePath";
import { getBodySilhouetteAsset } from "./bodyMapSilhouetteAsset";
import {
  collectHeatmapDotPlacementTargetsForCoarsePart,
  MAX_HEATMAP_DOTS_PER_REGION,
  sampleHeatmapDotPlacements,
  type BodySubpath,
} from "./bodyMapSampleDots";
import {
  countToPerceptualNormalized,
  getRegionCountForBodyMapPart,
} from "./bodyMapVisualization";
import {
  WHOLE_BODY_GENERAL_COUNT_KEY,
  type BodyMapParentRegion,
  type BodyMapRegion,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

/**
 * Full-body map (Level 1 only in this file).
 *
 * - Part geometry is parsed from `body-silhouette-parts.svg` (see `bodyMapSilhouetteAsset.ts`).
 * - Level 2 zoomed SVG + fine hit targets will live in a separate component later; filtering hooks already exist
 *   on context (`selectedBodyFineSubregion` + `BodyMapSelection.fineSubregion`).
 */
type TooltipState = { label: string; count: number; x: number; y: number };

const HEATMAP_DOT_RADIUS = 45;
const HEATMAP_DOT_OPACITY_MIN = 0.22;
const HEATMAP_DOT_OPACITY_MAX = 0.52;

/** Inner `g` translate (path data + clip live in this space). */
const BODY_MAP_INNER_TX = 0;

const BODY_MAP_SCALE_PIVOT_OX = 418.7415;
const BODY_MAP_SCALE_PIVOT_OY = 909.6845;
const BODY_MAP_CONTENT_SCALE_X = 1.04;
const BODY_MAP_CONTENT_SCALE_Y = 1;

const BODY_MAP_UNIFORM_SCALE_TRANSFORM = `translate(${BODY_MAP_SCALE_PIVOT_OX} ${BODY_MAP_SCALE_PIVOT_OY}) scale(${BODY_MAP_CONTENT_SCALE_X} ${BODY_MAP_CONTENT_SCALE_Y}) translate(${-BODY_MAP_SCALE_PIVOT_OX} ${-BODY_MAP_SCALE_PIVOT_OY})`;

type BodyPart = {
  id: BodyMapRegion;
  label: string;
  subpaths: BodySubpath[];
};

type DensityAnchor = {
  x: number;
  y: number;
  spreadX: number;
  spreadY: number;
};

const BODY_PARTS: BodyPart[] = getBodySilhouetteAsset().parts as BodyPart[];

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

const BODY_PARTS_FOR_HIT_TARGETS: BodyPart[] = (() => {
  const byId = new Map(BODY_PARTS.map((p) => [p.id, p]));
  const ordered = BODY_MAP_HIT_TARGET_ORDER.map((id) => byId.get(id)).filter(
    (p): p is BodyPart => p != null,
  );
  const seen = new Set(ordered.map((p) => p.id));
  for (const p of BODY_PARTS) {
    if (!seen.has(p.id)) ordered.push(p);
  }
  return ordered;
})();

const REGION_DENSITY_ANCHORS: Record<BodyMapRegion, DensityAnchor[]> = {
  head: [{ x: 418, y: 198, spreadX: 20, spreadY: 22 }],
  neck: [{ x: 418, y: 305, spreadX: 14, spreadY: 12 }],
  torso: [{ x: 418, y: 610, spreadX: 84, spreadY: 120 }],
  arm: [
    { x: 275, y: 600, spreadX: 34, spreadY: 56 },
    { x: 560, y: 600, spreadX: 34, spreadY: 56 },
  ],
  wrist: [
    { x: 175, y: 810, spreadX: 16, spreadY: 18 },
    { x: 660, y: 810, spreadX: 16, spreadY: 18 },
  ],
  hand: [
    { x: 140, y: 900, spreadX: 22, spreadY: 24 },
    { x: 700, y: 900, spreadX: 22, spreadY: 24 },
  ],
  leg: [
    { x: 345, y: 1180, spreadX: 32, spreadY: 76 },
    { x: 492, y: 1180, spreadX: 32, spreadY: 76 },
  ],
  ankle: [
    { x: 350, y: 1555, spreadX: 14, spreadY: 14 },
    { x: 486, y: 1555, spreadX: 14, spreadY: 14 },
  ],
  foot: [
    { x: 355, y: 1665, spreadX: 26, spreadY: 20 },
    { x: 485, y: 1665, spreadX: 26, spreadY: 20 },
  ],
};

export type BodyMapVariant = "countHeatmap" | "rawDots";

type BodyMapProps = {
  paperCountsByPart?: Record<string, number>;
  /**
   * Papers in the current filter; Dot view places one dot per body-site hit (bilateral unspecified → L+R).
   */
  heatmapDotPapers?: readonly ResearchPaper[];
  /**
   * Full-dataset region counts used only for the fixed heatmap colour domain and legend.
   * When omitted, `paperCountsByPart` is used (e.g. static view without filter context).
   */
  heatmapScaleReferenceCounts?: Record<string, number>;
  variant?: BodyMapVariant;
  selectedBodyRegion?: BodyMapParentRegion | null;
  onSelectBodyRegion?: (parent: BodyMapParentRegion | null) => void;
};

/** Area view legend alignment: #ffe4e6 → #db2777 */
function interpolatePinkDensityTone(t: number): string {
  const u = Math.min(1, Math.max(0, t));
  const c0 = { r: 255, g: 228, b: 230 };
  const c1 = { r: 219, g: 39, b: 119 };
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * u);
  return `rgb(${lerp(c0.r, c1.r)}, ${lerp(c0.g, c1.g)}, ${lerp(c0.b, c1.b)})`;
}

/** Emphasize high-density differences for clearer overlap contrast. */
function heatmapContrastT(t: number): number {
  return Math.pow(Math.min(1, Math.max(0, t)), 0.72);
}

function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(rnd: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function allocateAcrossAnchors(total: number, anchorCount: number): number[] {
  if (anchorCount <= 0) return [];
  const base = Math.floor(total / anchorCount);
  const remainder = total % anchorCount;
  return Array.from({ length: anchorCount }, (_, i) =>
    i < remainder ? base + 1 : base,
  );
}

function buildPath2D(subpaths: BodySubpath[]): Path2D {
  const path = new Path2D();
  for (const subpath of subpaths) {
    path.addPath(new Path2D(subpath.d));
  }
  return path;
}

function createPathPointTester(
  path: Path2D,
): ((x: number, y: number) => boolean) | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return (x: number, y: number) => ctx.isPointInPath(path, x, y);
}

function generateAnchoredGaussianDots(
  region: BodyMapRegion,
  regionSubpaths: BodySubpath[],
  dotCount: number,
): { x: number; y: number }[] {
  if (dotCount <= 0) return [];
  const anchors = REGION_DENSITY_ANCHORS[region];
  if (!anchors?.length) return [];
  const rnd = mulberry32(hashStringToSeed(`${region}:${dotCount}`));
  const bodyPath = new Path2D(BODY_MAP_OUTLINE_PATH_D);
  const regionPath = buildPath2D(regionSubpaths);
  const isInBody = createPathPointTester(bodyPath);
  const isInRegion = createPathPointTester(regionPath);
  const pointsPerAnchor = allocateAcrossAnchors(dotCount, anchors.length);
  const out: { x: number; y: number }[] = [];
  for (let anchorIndex = 0; anchorIndex < anchors.length; anchorIndex++) {
    const anchor = anchors[anchorIndex];
    const n = pointsPerAnchor[anchorIndex] ?? 0;
    for (let i = 0; i < n; i++) {
      let accepted: { x: number; y: number } | null = null;
      for (let attempt = 0; attempt < 80; attempt++) {
        const x = anchor.x + gaussianRandom(rnd) * anchor.spreadX;
        const y = anchor.y + gaussianRandom(rnd) * anchor.spreadY;
        const bodyPass = isInBody ? isInBody(x, y) : true;
        const regionPass = isInRegion ? isInRegion(x, y) : true;
        if (bodyPass && regionPass) {
          accepted = { x, y };
          break;
        }
      }
      if (accepted) {
        out.push(accepted);
      } else {
        out.push({ x: anchor.x, y: anchor.y });
      }
    }
  }
  return out;
}

export function BodyMap({
  paperCountsByPart = {},
  heatmapDotPapers,
  heatmapScaleReferenceCounts,
  variant = "countHeatmap",
  selectedBodyRegion = null,
  onSelectBodyRegion,
}: BodyMapProps) {
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
  const [dotsByPartId, setDotsByPartId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});

  const paperCountsKey = useMemo(
    () => JSON.stringify(paperCountsByPart),
    [paperCountsByPart],
  );

  const heatmapPaperIdsKey = useMemo(
    () => (heatmapDotPapers ?? []).map((p) => p.id).join("\0"),
    [heatmapDotPapers],
  );

  const wholeBodyGeneralPaperCount = useMemo(() => {
    const raw = JSON.parse(paperCountsKey) as Record<string, number>;
    return getRegionCountForBodyMapPart(WHOLE_BODY_GENERAL_COUNT_KEY, raw);
  }, [paperCountsKey]);

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

  const countColorDomain = useMemo<[number, number]>(() => {
    const maxVal = Math.max(
      0,
      ...BODY_PARTS.map((part) =>
        getRegionCountForBodyMapPart(part.id, rawForGlobalHeatmapScale),
      ),
    );
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [rawForGlobalHeatmapScale]);

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

  const legendTickValues = useMemo(() => {
    const lo = countColorDomain[0];
    const hi = countColorDomain[1];
    const mid = lo + (hi - lo) / 2;
    return [lo, mid, hi].map((v) => Math.round(v));
  }, [countColorDomain]);
  const rawDotsContoursByPart = useMemo<
    { partId: BodyMapRegion; contours: ContourMultiPolygon[] }[]
  >(() => {
    if (variant !== "rawDots") return [];
    const parts = BODY_PARTS;
    const density = contourDensity<{ x: number; y: number }>()
      .x((d: { x: number; y: number }) => d.x)
      .y((d: { x: number; y: number }) => d.y)
      .size([BODY_MAP_VIEW.w, BODY_MAP_VIEW.y + BODY_MAP_VIEW.h])
      .bandwidth(36)
      .thresholds(28);
    return parts
      .map((part) => {
        const points = dotsByPartId[part.id] ?? [];
        if (points.length < 2) return null;
        const contours = density(points);
        return { partId: part.id, contours };
      })
      .filter(
        (
          entry,
        ): entry is {
          partId: BodyMapRegion;
          contours: ContourMultiPolygon[];
        } => entry !== null,
      );
  }, [dotsByPartId, variant]);
  const rawDotsGlobalContourMaxValue = useMemo(() => {
    return Math.max(
      0,
      ...rawDotsContoursByPart.flatMap((entry) =>
        entry.contours.map(
          (contour: ContourMultiPolygon) => contour.value ?? 0,
        ),
      ),
    );
  }, [rawDotsContoursByPart]);
  const rawDotsContourPath = useMemo(() => geoPath(), []);
  const rawDotsLegendTicks = useMemo(() => {
    const lo = countColorDomain[0];
    const hi = countColorDomain[1];
    const mid = lo + (hi - lo) / 2;
    return [lo, mid, hi].map((v) => Math.round(v));
  }, [countColorDomain]);

  useLayoutEffect(() => {
    let cancelled = false;
    const next: Record<string, { x: number; y: number }[]> = {};
    for (const part of BODY_PARTS) {
      if (variant === "rawDots") {
        const papersForDots = heatmapDotPapers ?? [];
        const n = collectHeatmapDotPlacementTargetsForCoarsePart(
          part.id,
          papersForDots,
          part.subpaths,
        ).length;
        const capped = Math.min(n, MAX_HEATMAP_DOTS_PER_REGION);
        next[part.id] = generateAnchoredGaussianDots(
          part.id,
          part.subpaths,
          capped,
        );
      } else {
        const papersForDots = heatmapDotPapers ?? [];
        const targets = collectHeatmapDotPlacementTargetsForCoarsePart(
          part.id,
          papersForDots,
          part.subpaths,
        );
        next[part.id] = sampleHeatmapDotPlacements(
          part.subpaths,
          targets,
          part.id,
        );
      }
    }
    queueMicrotask(() => {
      if (!cancelled) setDotsByPartId(next);
    });
    return () => {
      cancelled = true;
    };
  }, [paperCountsKey, variant, heatmapPaperIdsKey, heatmapDotPapers]);

  const wholeBodyOutlineActive =
    hoveredPartId === WHOLE_BODY_GENERAL_COUNT_KEY ||
    selectedBodyRegion === "wholeBody";

  const wholeBodyRingHovered = hoveredPartId === WHOLE_BODY_GENERAL_COUNT_KEY;

  /** Thick masked ring: stay visible while whole body is selected, not only on hover. */
  const wholeBodyHitRingVisible =
    wholeBodyRingHovered || selectedBodyRegion === "wholeBody";

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
    onSelectBodyRegion?.("wholeBody");
  }, [onSelectBodyRegion]);

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
        onSelectBodyRegion?.(part.id);
      };
    },
    [onSelectBodyRegion],
  );

  const ariaLabel =
    variant === "countHeatmap"
      ? "Body map: smooth density heatmap — overlapping dots encode paper concentration per region on a fixed full-dataset scale; whole-body general studies use a full-silhouette tint instead of regional dots; hover regions or the outer figure outline for counts, including whole-body (general)."
      : "Body map: one dot per paper, placed randomly within each body region; whole-body general studies use a full-silhouette tint instead of regional dots; hover regions or the outer figure outline for whole-body (general) counts.";
  const mapTransform = BODY_MAP_UNIFORM_SCALE_TRANSFORM;
  const activeView = BODY_MAP_VIEW;
  const activeClipPath = `url(#${clipPathId})`;

  return (
    <div className="body-map-root">
      <div className="body-map-svg-wrap">
        {selectedBodyRegion != null && onSelectBodyRegion ? (
          <button
            type="button"
            className="body-map-clear-selection"
            onClick={() => onSelectBodyRegion(null)}
            aria-label="Clear body region filter"
          >
            Clear
          </button>
        ) : null}
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
            <linearGradient
              id={rawDotsLegendGradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#ffe4e6" />
              <stop offset="100%" stopColor="#db2777" />
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
                d={BODY_MAP_OUTLINE_PATH_D}
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
                d={BODY_MAP_OUTLINE_PATH_D}
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
                d={BODY_MAP_OUTLINE_PATH_D}
                fill="transparent"
                pointerEvents="none"
              />
              <g id="layer1" transform={`translate(${BODY_MAP_INNER_TX})`}>
                {wholeBodySilhouetteTint ? (
                  <path
                    d={BODY_MAP_OUTLINE_PATH_D}
                    fill={wholeBodySilhouetteTint.fill}
                    fillOpacity={wholeBodySilhouetteTint.fillOpacity}
                    stroke="none"
                    pointerEvents="none"
                  />
                ) : null}
                {variant === "countHeatmap" ? (
                  <g pointerEvents="none">
                    {BODY_PARTS.flatMap((part) => {
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
                  <g pointerEvents="none" filter={`url(#${rawDotsSoftBlurId})`}>
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
                              pointerEvents="none"
                            />
                          );
                        },
                      );
                    })}
                    {rawDotsContoursByPart.length === 0
                      ? BODY_PARTS.flatMap((part) => {
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
                {BODY_PARTS_FOR_HIT_TARGETS.flatMap((part) =>
                  part.subpaths.map((sp, i) => (
                    <path
                      key={`${part.id}-hit-${i}`}
                      id={`${part.id}-hit-${i}`}
                      d={sp.d}
                      transform={sp.transform}
                      fill={
                        hoveredPartId === part.id ||
                        selectedBodyRegion === part.id
                          ? `url(#${hoverGradientId})`
                          : "transparent"
                      }
                      fillOpacity={
                        hoveredPartId === part.id ||
                        selectedBodyRegion === part.id
                          ? 0.78
                          : 1
                      }
                      filter={
                        hoveredPartId === part.id ||
                        selectedBodyRegion === part.id
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
              transform={`translate(${BODY_MAP_INNER_TX})`}
              pointerEvents="auto"
            >
              <path
                d={BODY_MAP_OUTLINE_PATH_D}
                fill="none"
                stroke={wholeBodyHitRingVisible ? "#fbcfe8" : "transparent"}
                strokeOpacity={
                  wholeBodyRingHovered ? 0.88 : wholeBodyHitRingVisible ? 0.52 : 1
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
                d={BODY_MAP_OUTLINE_PATH_D}
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
      </div>

      {variant === "countHeatmap" ? (
        <div className="body-map-heatmap-legend">
          <svg
            width="100%"
            height="18"
            role="img"
            aria-label="Paper density gradient legend"
          >
            <defs>
              <linearGradient
                id={heatLegendGradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={interpolatePinkDensityTone(0)} />
                <stop offset="100%" stopColor={interpolatePinkDensityTone(1)} />
              </linearGradient>
            </defs>
            <rect
              x="0"
              y="2"
              width="100%"
              height="10"
              rx="5"
              fill={`url(#${heatLegendGradientId})`}
            />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.68rem",
              color: "#64748b",
              marginTop: "0.15rem",
              fontVariantNumeric: "tabular-nums",
            }}
            aria-hidden
          >
            <span>{legendTickValues[0].toLocaleString()}</span>
            <span>{legendTickValues[1].toLocaleString()}</span>
            <span>{legendTickValues[2].toLocaleString()}</span>
          </div>
          <p className="body-map-heatmap-legend-caption">
            Paper density (low to high): {countColorDomain[0].toLocaleString()}{" "}
            to {countColorDomain[1].toLocaleString()} papers. Hover regions or
            the outer outline for counts (outline shows whole-body general).
          </p>
        </div>
      ) : null}
      {variant === "rawDots" ? (
        <div className="body-map-heatmap-legend">
          <svg
            width="100%"
            height="18"
            role="img"
            aria-label="Density strength gradient legend"
          >
            <rect
              x="0"
              y="2"
              width="100%"
              height="10"
              rx="5"
              fill={`url(#${rawDotsLegendGradientId})`}
            />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.68rem",
              color: "#64748b",
              marginTop: "0.15rem",
              fontVariantNumeric: "tabular-nums",
            }}
            aria-hidden
          >
            <span>{rawDotsLegendTicks[0].toLocaleString()}</span>
            <span>{rawDotsLegendTicks[1].toLocaleString()}</span>
            <span>{rawDotsLegendTicks[2].toLocaleString()}</span>
          </div>
          <p className="body-map-heatmap-legend-caption">
            Paper count (low to high): {countColorDomain[0].toLocaleString()} to{" "}
            {countColorDomain[1].toLocaleString()}. Dots use d3 density
            smoothing for visual clustering. Hover the outline for whole-body
            (general).
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
