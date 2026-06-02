import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { geoPath } from "d3";
import type { ContourMultiPolygon } from "d3-contour";
import {
  areaDotsLruPut,
  areaDotsLruTouch,
} from "../shared/bodyMapAreaDotsCache";
import { MAX_HEATMAP_DOTS_PER_REGION } from "../bodyMapSampleDots";
import {
  buildHeadAreaDensityDotsByHitId,
  buildHeadDotsByHitId,
  HEAD_DETAIL_VIEWBOX,
  type HeadShapeSpec,
} from "./headDetailSampleDots";
import type { BodyMapVariant } from "../bodyMapVariant";
import { BodyMapHoverTooltip } from "../shared/BodyMapHoverTooltip";
import type { BodyMapTooltipState } from "../shared/BodyMapHoverTooltip";
import {
  headBilateralTooltip,
  simpleBodyMapTooltip,
} from "@/lib/research/bodyMapBilateralTooltips";
import { BodyMapHeatmapLegend } from "../shared/BodyMapHeatmapLegend";
import { countToPerceptualNormalized } from "../bodyMapVisualization";
import {
  detailAreaContourOpacity,
  detailAreaPinkForCount,
} from "../shared/bodyMapHeatmapColors";
import { BodyMapAreaViewFilterDefs } from "../shared/BodyMapAreaViewFilterDefs";
import { BodyMapAreaViewLoadingOverlay } from "../shared/BodyMapAreaViewLoadingOverlay";
import { useDeferredAreaViewResult } from "../shared/useDeferredAreaViewResult";
import {
  buildDetailAreaDensityContoursByHit,
  maxContourValueFromLayers,
} from "../full-body/bodyMapAreaContours";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  BODY_MAP_DETAIL_SELECTION_MODE,
  mergedHoverPairHitIds,
} from "@/lib/research/bodyMapDetailSelectionMode";
import { normalizeBodyMapSubpart } from "@/lib/research/bodyMapChipSelection";
import {
  paperMatchesHeadFineSelection,
  paperMatchesHeadFineSelectionForSideDots,
  paperMatchesHeadFineSelectionForSideAreaView,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

/** Smaller than full-body dots so subregions on the head SVG read more clearly. */
const HEATMAP_DOT_RADIUS = 28;
const HEATMAP_DOT_OPACITY_MIN = 0.12;
const HEATMAP_DOT_OPACITY_MAX = 0.32;
const MAX_HEATMAP_DOTS_PER_HIT = MAX_HEATMAP_DOTS_PER_REGION;

/** Finer grid + more thresholds smooth density contour edges in Area view. */
const HEAD_RAW_DOTS_DENSITY_BANDWIDTH = 70;
const HEAD_RAW_DOTS_DENSITY_CELL_SIZE = 2;
const HEAD_RAW_DOTS_DENSITY_THRESHOLDS = 30;

/** Fill hit ids in paint order (later = on top for pointer priority). */
const HEAD_FILL_HIT_IDS = [
  "forehead",
  "nose",
  "lip",
  "tongue",
  "left-ear",
  "right-ear",
  "left-cheek",
  "right-cheek",
] as const;

const HEAD_HIT_LABELS: Record<string, string> = {
  general: "General",
  forehead: "Forehead",
  nose: "Nose",
  lip: "Lip",
  tongue: "Tongue",
  "left-ear": "Ear (left)",
  "right-ear": "Ear (right)",
  "left-cheek": "Cheek (left)",
  "right-cheek": "Cheek (right)",
};

function heatmapContrastT(t: number): number {
  return Math.pow(Math.min(1, Math.max(0, t)), 0.72);
}

type TooltipState = BodyMapTooltipState;

const HEAD_LATERAL_HIT_IDS = new Set([
  "left-ear",
  "right-ear",
  "left-cheek",
  "right-cheek",
]);

function countHeadHit(
  papers: readonly ResearchPaper[],
  hitId: string,
  variant: BodyMapVariant,
): number {
  if (HEAD_LATERAL_HIT_IDS.has(hitId)) {
    const matchFn =
      variant === "rawDots"
        ? paperMatchesHeadFineSelectionForSideAreaView
        : paperMatchesHeadFineSelectionForSideDots;
    return papers.filter((p) => matchFn(p, hitId)).length;
  }
  return papers.filter((p) => paperMatchesHeadFineSelection(p, hitId)).length;
}

/** Single asset: `head.svg` (head-face, head-outline, fine regions). */
function parseHeadDetailWideSvg(svgText: string): {
  silhouetteD: string;
  generalOutlineD: string;
  maskFaceD: string;
  shapeByHit: Map<string, HeadShapeSpec>;
} {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const faceD = doc
    .querySelector('path[id="head-face"]')
    ?.getAttribute("d")
    ?.trim();
  if (!faceD) {
    throw new Error('Head map SVG: expected path[id="head-face"].');
  }
  const outlineD = doc
    .querySelector('path[id="head-outline"]')
    ?.getAttribute("d")
    ?.trim();
  if (!outlineD) {
    throw new Error('Head map SVG: expected path[id="head-outline"].');
  }

  const shapeByHit = new Map<string, HeadShapeSpec>();
  for (const id of HEAD_FILL_HIT_IDS) {
    const pathEl = doc.querySelector(`path[id="${id}"]`);
    const ellEl = doc.querySelector(`ellipse[id="${id}"]`);
    if (pathEl) {
      const d = pathEl.getAttribute("d")?.trim();
      if (!d) continue;
      shapeByHit.set(id, {
        kind: "path",
        d,
        transform: pathEl.getAttribute("transform") ?? undefined,
      });
    } else if (ellEl) {
      const cx = Number(ellEl.getAttribute("cx"));
      const cy = Number(ellEl.getAttribute("cy"));
      const rx = Number(ellEl.getAttribute("rx"));
      const ry = Number(ellEl.getAttribute("ry"));
      if (![cx, cy, rx, ry].every((n) => Number.isFinite(n))) continue;
      shapeByHit.set(id, {
        kind: "ellipse",
        cx,
        cy,
        rx,
        ry,
        transform: ellEl.getAttribute("transform") ?? undefined,
      });
    }
  }
  return {
    silhouetteD: faceD,
    generalOutlineD: outlineD,
    maskFaceD: faceD,
    shapeByHit,
  };
}

export type HeadBodyMapDetailProps = {
  variant: BodyMapVariant;
  papers: readonly ResearchPaper[];
};

export function HeadBodyMapDetail({ variant, papers }: HeadBodyMapDetailProps) {
  const { toggleBodyMapChip, isBodyMapChipSelected, selectedBodyMapChips } =
    useResearchFilter();

  const uid = useId().replace(/:/g, "");
  const hoverGradientId = `head-detail-hover-${uid}`;
  const softFillFilterId = `head-detail-soft-${uid}`;
  const heatDotRadialGradientId = `head-detail-heat-radial-${uid}`;
  const generalRingMaskId = `head-detail-general-mask-${uid}`;
  const rawDotsSoftBlurId = `head-detail-raw-dots-soft-blur-${uid}`;
  const areaMaskFeatherFilterId = `head-detail-area-mask-feather-${uid}`;

  const [headWideSvgText, setHeadWideSvgText] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredHitId, setHoveredHitId] = useState<string | null>(null);
  const [dotsByHitId, setDotsByHitId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});
  const [isAreaDotsComputing, setIsAreaDotsComputing] = useState(false);

  const headAreaDotsSampleCacheRef = useRef<
    Map<string, Record<string, { x: number; y: number }[]>>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/body-map/head.svg")
      .then((r) => {
        if (!r.ok) throw new Error(`head map HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setHeadWideSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setHeadWideSvgText("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const headParse = useMemo(() => {
    if (!headWideSvgText) {
      return {
        silhouetteD: "",
        generalOutlineD: "",
        maskFaceD: "",
        shapeByHit: new Map<string, HeadShapeSpec>(),
        error: null as string | null,
      };
    }
    try {
      const parsed = parseHeadDetailWideSvg(headWideSvgText);
      return {
        ...parsed,
        error: null as string | null,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        silhouetteD: "",
        generalOutlineD: "",
        maskFaceD: "",
        shapeByHit: new Map<string, HeadShapeSpec>(),
        error: msg,
      };
    }
  }, [headWideSvgText]);

  const {
    silhouetteD,
    generalOutlineD,
    maskFaceD,
    shapeByHit,
    error: headParseError,
  } = headParse;

  const paperIdsKey = useMemo(
    () => papers.map((p) => p.id).join("\0"),
    [papers],
  );

  const shapeByHitKey = useMemo(
    () => [...shapeByHit.keys()].sort().join("\0"),
    [shapeByHit],
  );

  const countsByHit = useMemo(() => {
    const keys = ["general", ...HEAD_FILL_HIT_IDS] as const;
    const m: Record<string, number> = {};
    for (const k of keys) {
      m[k] = countHeadHit(papers, k, variant);
    }
    return m;
  }, [papers, paperIdsKey, variant]);

  const countColorDomain = useMemo<[number, number]>(() => {
    const vals = [...HEAD_FILL_HIT_IDS.map((id) => countsByHit[id] ?? 0)];
    const maxVal = Math.max(0, ...vals);
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [countsByHit]);

  const areaViewEnabled = variant === "rawDots";
  const areaDotsKey = useMemo(
    () =>
      HEAD_FILL_HIT_IDS.map(
        (hitId) => `${hitId}:${(dotsByHitId[hitId] ?? []).length}`,
      ).join("|"),
    [dotsByHitId],
  );

  const {
    result: headRawDotsContoursByHit,
    isComputing: isAreaContoursComputing,
  } = useDeferredAreaViewResult(
    areaViewEnabled,
    () =>
      buildDetailAreaDensityContoursByHit(
        HEAD_FILL_HIT_IDS,
        dotsByHitId,
        HEAD_DETAIL_VIEWBOX,
        {
          cellSize: HEAD_RAW_DOTS_DENSITY_CELL_SIZE,
          bandwidth: HEAD_RAW_DOTS_DENSITY_BANDWIDTH,
          thresholds: HEAD_RAW_DOTS_DENSITY_THRESHOLDS,
        },
      ),
    [areaDotsKey, dotsByHitId],
  );

  const headRawDotsGlobalContourMaxValue = useMemo(() => {
    return maxContourValueFromLayers(headRawDotsContoursByHit ?? []);
  }, [headRawDotsContoursByHit]);

  const areaViewLoading =
    areaViewEnabled && (isAreaDotsComputing || isAreaContoursComputing);

  const headRawDotsContourPath = useMemo(() => geoPath(), []);

  useLayoutEffect(() => {
    if (!shapeByHit.size) return;
    let cancelled = false;
    const areaCacheKey = `${paperIdsKey}\0${shapeByHitKey}`;

    if (variant === "rawDots") {
      setIsAreaDotsComputing(true);
      const cached = areaDotsLruTouch(
        headAreaDotsSampleCacheRef.current,
        areaCacheKey,
      );
      if (cached) {
        queueMicrotask(() => {
          if (!cancelled) {
            setDotsByHitId(structuredClone(cached));
            setIsAreaDotsComputing(false);
          }
        });
        return () => {
          cancelled = true;
          setIsAreaDotsComputing(false);
        };
      }
    } else {
      setIsAreaDotsComputing(false);
    }

    const next =
      variant === "rawDots"
        ? buildHeadAreaDensityDotsByHitId(
            papers,
            shapeByHit,
            MAX_HEATMAP_DOTS_PER_HIT,
          )
        : buildHeadDotsByHitId(papers, shapeByHit, MAX_HEATMAP_DOTS_PER_HIT);

    if (variant === "rawDots") {
      areaDotsLruPut(
        headAreaDotsSampleCacheRef.current,
        areaCacheKey,
        structuredClone(next),
      );
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setDotsByHitId(next);
        setIsAreaDotsComputing(false);
      }
    });
    return () => {
      cancelled = true;
      setIsAreaDotsComputing(false);
    };
  }, [shapeByHit, paperIdsKey, papers, variant, shapeByHitKey]);

  const clearHover = useCallback(() => {
    setHoveredHitId(null);
    setTooltip(null);
  }, []);

  const handleFillHitEnter = useCallback(
    (hitId: string) => {
      return (e: PointerEvent<SVGElement>) => {
        setHoveredHitId(hitId);
        const bilateral = headBilateralTooltip(
          papers,
          hitId,
          e.clientX,
          e.clientY,
        );
        setTooltip(
          bilateral ??
            simpleBodyMapTooltip(
              HEAD_HIT_LABELS[hitId] ?? hitId,
              countsByHit[hitId] ?? 0,
              e.clientX,
              e.clientY,
            ),
        );
      };
    },
    [countsByHit, papers],
  );

  const handleMove = useCallback((e: PointerEvent<SVGElement>) => {
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
    );
  }, []);

  const toggleFine = useCallback(
    (hitId: string) => {
      toggleBodyMapChip("head", hitId);
    },
    [toggleBodyMapChip],
  );

  const generalRingHovered = hoveredHitId === "general";
  const generalRingActive =
    generalRingHovered || isBodyMapChipSelected("head", "general");

  /** Avoid stacking a thick General ring on top of a selected fine fill (e.g. forehead). */
  const suppressSelectedFineFillWhileGeneralHover =
    generalRingHovered &&
    selectedBodyMapChips.some(
      (c) =>
        c.parent === "head" &&
        normalizeBodyMapSubpart(c.subpart) !== "" &&
        normalizeBodyMapSubpart(c.subpart) !== "general",
    );

  const vbParts = HEAD_DETAIL_VIEWBOX.split(/\s+/).map(Number);
  const vbW = vbParts[2] ?? 210;
  const vbH = vbParts[3] ?? 297;

  return (
    <div className="body-map-root head-detail-root">
      <div className="body-map-svg-wrap head-detail-svg-wrap">
        {headParseError ? (
          <p className="head-detail-error" role="alert">
            {headParseError}
          </p>
        ) : null}
        {headWideSvgText === null ? (
          <p className="head-detail-loading">Loading head map…</p>
        ) : null}
        {headWideSvgText === "" ? (
          <p className="head-detail-error" role="alert">
            Could not load head map SVG.
          </p>
        ) : null}
        {headWideSvgText &&
        silhouetteD &&
        generalOutlineD &&
        !headParseError ? (
          <BodyMapAreaViewLoadingOverlay visible={areaViewLoading}>
            <svg
              className="body-map-svg head-detail-svg"
              width="100%"
              height="auto"
              viewBox={HEAD_DETAIL_VIEWBOX}
              preserveAspectRatio="xMidYMin meet"
              role="img"
              aria-label="Head detail body map: subregions for filtered papers"
            >
              <defs>
                <linearGradient
                  id={hoverGradientId}
                  gradientUnits="userSpaceOnUse"
                  x1={20}
                  y1={0}
                  x2={120}
                  y2={297}
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
                <BodyMapAreaViewFilterDefs
                  rawDotsSoftBlurId={rawDotsSoftBlurId}
                  areaMaskFeatherFilterId={areaMaskFeatherFilterId}
                />
                <mask
                  id={generalRingMaskId}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  x={0}
                  y={0}
                  width={vbW}
                  height={vbH}
                >
                  <rect x={0} y={0} width={vbW} height={vbH} fill="white" />
                  <path d={maskFaceD} fill="black" />
                  {/*
                  Hide general-ring stroke anywhere it sits over fine subparts (cheek, ear, …),
                  and over the face interior (head-face) so the ring reads as an outer band only.
                */}
                  {HEAD_FILL_HIT_IDS.map((hitId) => {
                    const spec = shapeByHit.get(hitId);
                    if (!spec) return null;
                    if (spec.kind === "path") {
                      return (
                        <path
                          key={`general-mask-${hitId}`}
                          d={spec.d}
                          transform={spec.transform}
                          fill="black"
                        />
                      );
                    }
                    return (
                      <ellipse
                        key={`general-mask-${hitId}`}
                        cx={spec.cx}
                        cy={spec.cy}
                        rx={spec.rx}
                        ry={spec.ry}
                        transform={spec.transform}
                        fill="black"
                      />
                    );
                  })}
                </mask>
                {HEAD_FILL_HIT_IDS.map((hitId) => {
                  const spec = shapeByHit.get(hitId);
                  if (!spec) return null;
                  const softMaskId = `head-detail-area-soft-${uid}-${hitId}`;
                  return (
                    <mask
                      key={softMaskId}
                      id={softMaskId}
                      maskUnits="userSpaceOnUse"
                      maskContentUnits="userSpaceOnUse"
                      x={0}
                      y={0}
                      width={vbW}
                      height={vbH}
                    >
                      <rect x={0} y={0} width={vbW} height={vbH} fill="black" />
                      {spec.kind === "path" ? (
                        <path
                          d={spec.d}
                          transform={spec.transform}
                          fill="white"
                          filter={`url(#${areaMaskFeatherFilterId})`}
                        />
                      ) : (
                        <ellipse
                          cx={spec.cx}
                          cy={spec.cy}
                          rx={spec.rx}
                          ry={spec.ry}
                          transform={spec.transform}
                          fill="white"
                          filter={`url(#${areaMaskFeatherFilterId})`}
                        />
                      )}
                    </mask>
                  );
                })}
              </defs>

              <path
                d={silhouetteD}
                fill="none"
                stroke="#1e293b"
                strokeOpacity={0.45}
                strokeWidth={1}
                vectorEffect="nonScalingStroke"
                pointerEvents="none"
              />

              {variant === "rawDots" ? (
                <g pointerEvents="none" aria-hidden>
                  {(headRawDotsContoursByHit ?? []).map((entry) => {
                    const softMaskId = `head-detail-area-soft-${uid}-${entry.hitId}`;
                    const partCount = countsByHit[entry.hitId] ?? 0;
                    const fillColor = detailAreaPinkForCount(
                      partCount,
                      countsByHit,
                      HEAD_FILL_HIT_IDS,
                    );
                    const globalMax =
                      headRawDotsGlobalContourMaxValue <= 0
                        ? 1
                        : headRawDotsGlobalContourMaxValue;
                    return (
                      <g
                        key={`head-raw-area-${entry.hitId}`}
                        mask={`url(#${softMaskId})`}
                      >
                        <g filter={`url(#${rawDotsSoftBlurId})`}>
                          {entry.contours.map(
                            (contour: ContourMultiPolygon, i: number) => {
                              const d = headRawDotsContourPath(contour);
                              if (!d) return null;
                              const value = contour.value ?? 0;
                              const normalized = Math.min(
                                1,
                                Math.max(0, value / globalMax),
                              );
                              const contrastAdjusted = Math.pow(
                                normalized,
                                1.35,
                              );
                              const opacity = detailAreaContourOpacity(
                                contrastAdjusted,
                                partCount,
                                countsByHit,
                                HEAD_FILL_HIT_IDS,
                              );
                              return (
                                <path
                                  key={`head-raw-density-${entry.hitId}-${i}`}
                                  d={d}
                                  fill={fillColor}
                                  fillOpacity={opacity}
                                  stroke="none"
                                  pointerEvents="none"
                                />
                              );
                            },
                          )}
                        </g>
                      </g>
                    );
                  })}
                  {(headRawDotsContoursByHit ?? []).length === 0
                    ? HEAD_FILL_HIT_IDS.map((hitId) => {
                        const softMaskId = `head-detail-area-soft-${uid}-${hitId}`;
                        const pts = dotsByHitId[hitId] ?? [];
                        if (pts.length === 0) return null;
                        const partCount = countsByHit[hitId] ?? 0;
                        const fillColor = detailAreaPinkForCount(
                          partCount,
                          countsByHit,
                          HEAD_FILL_HIT_IDS,
                        );
                        const fallbackOpacity = detailAreaContourOpacity(
                          1,
                          partCount,
                          countsByHit,
                          HEAD_FILL_HIT_IDS,
                        );
                        return (
                          <g
                            key={`head-raw-fallback-wrap-${hitId}`}
                            mask={`url(#${softMaskId})`}
                          >
                            <g filter={`url(#${rawDotsSoftBlurId})`}>
                              {pts.map((p, i) => (
                                <circle
                                  key={`head-raw-fallback-${hitId}-${i}`}
                                  cx={p.x}
                                  cy={p.y}
                                  r={3.8}
                                  fill={fillColor}
                                  fillOpacity={fallbackOpacity}
                                />
                              ))}
                            </g>
                          </g>
                        );
                      })
                    : null}
                </g>
              ) : null}

              {HEAD_FILL_HIT_IDS.map((hitId) => {
                const spec = shapeByHit.get(hitId);
                if (!spec) return null;
                const selected =
                  !suppressSelectedFineFillWhileGeneralHover &&
                  isBodyMapChipSelected("head", hitId);
                const hoverHitIds =
                  hoveredHitId && BODY_MAP_DETAIL_SELECTION_MODE === "merged"
                    ? mergedHoverPairHitIds("head", hoveredHitId)
                    : hoveredHitId
                      ? [hoveredHitId]
                      : [];
                const active = hoverHitIds.includes(hitId) || selected;
                const fillPaint = active
                  ? `url(#${hoverGradientId})`
                  : "transparent";
                const common = {
                  fill: fillPaint,
                  fillOpacity: active ? 0.78 : 1,
                  filter: active ? `url(#${softFillFilterId})` : undefined,
                  stroke: "none" as const,
                  pointerEvents: "all" as const,
                  style: { cursor: "pointer" as const },
                  onPointerEnter: handleFillHitEnter(hitId),
                  onPointerMove: handleMove,
                  onPointerLeave: clearHover,
                  onClick: () => toggleFine(hitId),
                };
                if (spec.kind === "path") {
                  return (
                    <path
                      key={hitId}
                      d={spec.d}
                      transform={spec.transform}
                      {...common}
                    />
                  );
                }
                return (
                  <ellipse
                    key={hitId}
                    cx={spec.cx}
                    cy={spec.cy}
                    rx={spec.rx}
                    ry={spec.ry}
                    transform={spec.transform}
                    {...common}
                  />
                );
              })}

              {variant === "countHeatmap" ? (
                <g pointerEvents="none">
                  {HEAD_FILL_HIT_IDS.flatMap((hitId) => {
                    const pts = dotsByHitId[hitId] ?? [];
                    const c = countsByHit[hitId] ?? 0;
                    const t = countToPerceptualNormalized(c, countColorDomain);
                    const tAdj = heatmapContrastT(t);
                    const opacity =
                      HEATMAP_DOT_OPACITY_MIN +
                      (HEATMAP_DOT_OPACITY_MAX - HEATMAP_DOT_OPACITY_MIN) *
                        tAdj;
                    return pts.map((p, i) => (
                      <circle
                        key={`${hitId}-${i}`}
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

              {/* General ring: paint last so it sits above fills and density layers. */}
              <path
                d={generalOutlineD}
                fill="none"
                stroke={generalRingActive ? "#fbcfe8" : "transparent"}
                strokeOpacity={
                  generalRingHovered ? 1 : generalRingActive ? 0.92 : 1
                }
                strokeWidth={10}
                vectorEffect="nonScalingStroke"
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="stroke"
                mask={`url(#${generalRingMaskId})`}
                style={{ cursor: "pointer" }}
                onPointerEnter={(e) => {
                  setHoveredHitId("general");
                  setTooltip(
                    simpleBodyMapTooltip(
                      HEAD_HIT_LABELS.general,
                      countsByHit.general ?? 0,
                      e.clientX,
                      e.clientY,
                    ),
                  );
                }}
                onPointerMove={handleMove}
                onPointerLeave={clearHover}
                onClick={() => toggleBodyMapChip("head", "general")}
                aria-label="Head general (outline)"
              />
            </svg>
          </BodyMapAreaViewLoadingOverlay>
        ) : null}
      </div>

      {headWideSvgText && silhouetteD && generalOutlineD && !headParseError ? (
        <BodyMapHeatmapLegend
          variant={variant}
          colorDomain={countColorDomain}
          gradientId={`${uid}-head-legend-${variant}`}
          className="head-detail-legend"
          caption={
            variant === "countHeatmap"
              ? `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Hover subregions or the outline for whole-head (general).`
              : `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Uses the same d3 density smoothing as the full-body map. Hover the outline for whole-head (general).`
          }
        />
      ) : null}

      <BodyMapHoverTooltip tooltip={tooltip} />
    </div>
  );
}
