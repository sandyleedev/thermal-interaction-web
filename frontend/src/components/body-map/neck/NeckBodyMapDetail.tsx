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
import { contourDensity, geoPath } from "d3";
import type { ContourMultiPolygon } from "d3-contour";
import { areaDotsLruPut, areaDotsLruTouch } from "../shared/bodyMapAreaDotsCache";
import { MAX_HEATMAP_DOTS_PER_REGION } from "../bodyMapSampleDots";
import {
  buildNeckAreaDensityDotsByHitId,
  buildNeckDotsByHitId,
  NECK_DETAIL_VIEWBOX,
  type NeckShapeSpec,
} from "./neckDetailSampleDots";
import type { BodyMapVariant } from "../bodyMapVariant";
import { BodyMapHeatmapLegend } from "../shared/BodyMapHeatmapLegend";
import {
  countToPerceptualNormalized,
} from "../bodyMapVisualization";
import {
  detailAreaContourOpacity,
  detailAreaPinkForCount,
} from "../shared/bodyMapHeatmapColors";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { normalizeBodyMapSubpart } from "@/lib/research/bodyMapChipSelection";
import {
  paperMatchesNeckFineSelection,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

/** Smaller than full-body dots so subregions on the neck SVG read more clearly. */
const HEATMAP_DOT_RADIUS = 18;
const HEATMAP_DOT_OPACITY_MIN = 0.22;
const HEATMAP_DOT_OPACITY_MAX = 0.52;
const MAX_HEATMAP_DOTS_PER_HIT = MAX_HEATMAP_DOTS_PER_REGION;

/** Finer grid + more thresholds smooth density contour edges in Area view. */
const NECK_RAW_DOTS_DENSITY_BANDWIDTH = 70;
const NECK_RAW_DOTS_DENSITY_CELL_SIZE = 2;
const NECK_RAW_DOTS_DENSITY_THRESHOLDS = 30;

/** General outline ring (thinner than head detail’s 10px stroke). */
const NECK_GENERAL_RING_STROKE_WIDTH = 6;

/** Fill hit ids in paint order (later = on top for pointer priority). */
const NECK_FILL_HIT_IDS = ["anterior", "posterior"] as const;

const NECK_SVG_PATH_ID_BY_HIT: Record<(typeof NECK_FILL_HIT_IDS)[number], string> = {
  anterior: "anterior-neck",
  posterior: "posterior-neck",
};

const NECK_HIT_LABELS: Record<string, string> = {
  general: "General",
  anterior: "Anterior",
  posterior: "Posterior",
};

function heatmapContrastT(t: number): number {
  return Math.pow(Math.min(1, Math.max(0, t)), 0.72);
}

type TooltipState = { label: string; count: number; x: number; y: number };

/** Single asset: `neck-subpart-outline.svg` (original-path, neck-outline, subparts). */
function parseNeckDetailSvg(svgText: string): {
  silhouetteD: string;
  generalOutlineD: string;
  shapeByHit: Map<string, NeckShapeSpec>;
} {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const silhouetteD = doc
    .querySelector('path[id="original-path"]')
    ?.getAttribute("d")
    ?.trim();
  if (!silhouetteD) {
    throw new Error('Neck map SVG: expected path[id="original-path"].');
  }
  const generalOutlineD = doc
    .querySelector('path[id="neck-outline"]')
    ?.getAttribute("d")
    ?.trim();
  if (!generalOutlineD) {
    throw new Error('Neck map SVG: expected path[id="neck-outline"].');
  }

  const shapeByHit = new Map<string, NeckShapeSpec>();
  for (const hitId of NECK_FILL_HIT_IDS) {
    const svgId = NECK_SVG_PATH_ID_BY_HIT[hitId];
    const pathEl = doc.querySelector(`path[id="${svgId}"]`);
    const d = pathEl?.getAttribute("d")?.trim();
    if (!d) {
      throw new Error(`Neck map SVG: expected path[id="${svgId}"].`);
    }
    shapeByHit.set(hitId, {
      kind: "path",
      d,
      transform: pathEl?.getAttribute("transform") ?? undefined,
    });
  }
  return {
    silhouetteD,
    generalOutlineD,
    shapeByHit,
  };
}

export type NeckBodyMapDetailProps = {
  variant: BodyMapVariant;
  papers: readonly ResearchPaper[];
};

export function NeckBodyMapDetail({
  variant,
  papers,
}: NeckBodyMapDetailProps) {
  const { toggleBodyMapChip, isBodyMapChipSelected, selectedBodyMapChips } =
    useResearchFilter();

  const uid = useId().replace(/:/g, "");
  const hoverGradientId = `neck-detail-hover-${uid}`;
  const softFillFilterId = `neck-detail-soft-${uid}`;
  const heatDotRadialGradientId = `neck-detail-heat-radial-${uid}`;
  const generalRingMaskId = `neck-detail-general-mask-${uid}`;
  const rawDotsSoftBlurId = `neck-detail-raw-dots-soft-blur-${uid}`;
  const areaMaskFeatherFilterId = `neck-detail-area-mask-feather-${uid}`;

  const [neckSvgText, setNeckSvgText] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredHitId, setHoveredHitId] = useState<string | null>(null);
  const [dotsByHitId, setDotsByHitId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});

  const neckAreaDotsSampleCacheRef = useRef<
    Map<string, Record<string, { x: number; y: number }[]>>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/body-map/neck-subpart-outline.svg")
      .then((r) => {
        if (!r.ok) throw new Error(`neck map HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setNeckSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setNeckSvgText("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const neckParse = useMemo(() => {
    if (!neckSvgText) {
      return {
        silhouetteD: "",
        generalOutlineD: "",
        shapeByHit: new Map<string, NeckShapeSpec>(),
        error: null as string | null,
      };
    }
    try {
      const parsed = parseNeckDetailSvg(neckSvgText);
      return {
        ...parsed,
        error: null as string | null,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        silhouetteD: "",
        generalOutlineD: "",
        shapeByHit: new Map<string, NeckShapeSpec>(),
        error: msg,
      };
    }
  }, [neckSvgText]);

  const {
    silhouetteD,
    generalOutlineD,
    shapeByHit,
    error: neckParseError,
  } = neckParse;

  const paperIdsKey = useMemo(() => papers.map((p) => p.id).join("\0"), [papers]);

  const shapeByHitKey = useMemo(
    () => [...shapeByHit.keys()].sort().join("\0"),
    [shapeByHit],
  );

  const countsByHit = useMemo(() => {
    const keys = ["general", ...NECK_FILL_HIT_IDS] as const;
    const m: Record<string, number> = {};
    for (const k of keys) {
      m[k] = papers.filter((p) => paperMatchesNeckFineSelection(p, k)).length;
    }
    return m;
  }, [papers, paperIdsKey]);

  const countColorDomain = useMemo<[number, number]>(() => {
    const vals = [...NECK_FILL_HIT_IDS.map((id) => countsByHit[id] ?? 0)];
    const maxVal = Math.max(0, ...vals);
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [countsByHit]);

  const neckRawDotsContoursByHit = useMemo(() => {
    if (variant !== "rawDots") return [];
    const vbParts = NECK_DETAIL_VIEWBOX.split(/\s+/).map(Number);
    const vbW = vbParts[2] ?? 210;
    const vbH = vbParts[3] ?? 297;
    const vbY = vbParts[1] ?? 0;
    const density = contourDensity<{ x: number; y: number }>()
      .x((d: { x: number; y: number }) => d.x)
      .y((d: { x: number; y: number }) => d.y)
      .size([vbW, vbY + vbH])
      .cellSize(NECK_RAW_DOTS_DENSITY_CELL_SIZE)
      .bandwidth(NECK_RAW_DOTS_DENSITY_BANDWIDTH)
      .thresholds(NECK_RAW_DOTS_DENSITY_THRESHOLDS);
    return NECK_FILL_HIT_IDS.flatMap((hitId) => {
      const points = dotsByHitId[hitId] ?? [];
      if (points.length < 2) return [];
      return [{ hitId, contours: density(points) }];
    });
  }, [dotsByHitId, variant]);

  const neckRawDotsGlobalContourMaxValue = useMemo(() => {
    return Math.max(
      0,
      ...neckRawDotsContoursByHit.flatMap((entry) =>
        entry.contours.map((c: ContourMultiPolygon) => c.value ?? 0),
      ),
    );
  }, [neckRawDotsContoursByHit]);

  const neckRawDotsContourPath = useMemo(() => geoPath(), []);

  useLayoutEffect(() => {
    if (!shapeByHit.size) return;
    let cancelled = false;
    const areaCacheKey = `${paperIdsKey}\0${shapeByHitKey}`;

    if (variant === "rawDots") {
      const cached = areaDotsLruTouch(
        neckAreaDotsSampleCacheRef.current,
        areaCacheKey,
      );
      if (cached) {
        queueMicrotask(() => {
          if (!cancelled) setDotsByHitId(structuredClone(cached));
        });
        return () => {
          cancelled = true;
        };
      }
    }

    const next =
      variant === "rawDots"
        ? buildNeckAreaDensityDotsByHitId(
            papers,
            shapeByHit,
            MAX_HEATMAP_DOTS_PER_HIT,
          )
        : buildNeckDotsByHitId(papers, shapeByHit, MAX_HEATMAP_DOTS_PER_HIT);

    if (variant === "rawDots") {
      areaDotsLruPut(
        neckAreaDotsSampleCacheRef.current,
        areaCacheKey,
        structuredClone(next),
      );
    }

    queueMicrotask(() => {
      if (!cancelled) setDotsByHitId(next);
    });
    return () => {
      cancelled = true;
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
        setTooltip({
          label: NECK_HIT_LABELS[hitId] ?? hitId,
          count: countsByHit[hitId] ?? 0,
          x: e.clientX,
          y: e.clientY,
        });
      };
    },
    [countsByHit],
  );

  const handleMove = useCallback((e: PointerEvent<SVGElement>) => {
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
    );
  }, []);

  const toggleFine = useCallback(
    (hitId: string) => {
      toggleBodyMapChip("neck", hitId);
    },
    [toggleBodyMapChip],
  );

  const generalRingHovered = hoveredHitId === "general";
  const generalRingActive =
    generalRingHovered || isBodyMapChipSelected("neck", "general");

  /** Avoid stacking a thick General ring on top of a selected fine fill. */
  const suppressSelectedFineFillWhileGeneralHover =
    generalRingHovered &&
    selectedBodyMapChips.some(
      (c) =>
        c.parent === "neck" &&
        normalizeBodyMapSubpart(c.subpart) !== "" &&
        normalizeBodyMapSubpart(c.subpart) !== "general",
    );

  const vbParts = NECK_DETAIL_VIEWBOX.split(/\s+/).map(Number);
  const vbW = vbParts[2] ?? 210;
  const vbH = vbParts[3] ?? 297;

  return (
    <div className="body-map-root neck-detail-root">
      <div className="body-map-svg-wrap neck-detail-svg-wrap">
        {neckParseError ? (
          <p className="neck-detail-error" role="alert">
            {neckParseError}
          </p>
        ) : null}
        {neckSvgText === null ? (
          <p className="neck-detail-loading">Loading neck map…</p>
        ) : null}
        {neckSvgText === "" ? (
          <p className="neck-detail-error" role="alert">
            Could not load neck map SVG.
          </p>
        ) : null}
        {neckSvgText &&
        silhouetteD &&
        generalOutlineD &&
        !neckParseError ? (
          <svg
            className="body-map-svg neck-detail-svg"
            width="100%"
            height="auto"
            viewBox={NECK_DETAIL_VIEWBOX}
            preserveAspectRatio="xMidYMin meet"
            role="img"
            aria-label="Neck detail body map: subregions for filtered papers"
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
              <filter
                id={rawDotsSoftBlurId}
                x="-70%"
                y="-70%"
                width="240%"
                height="240%"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur in="SourceGraphic" stdDeviation="17" />
              </filter>
              <filter
                id={areaMaskFeatherFilterId}
                x="-70%"
                y="-70%"
                width="240%"
                height="240%"
                colorInterpolationFilters="sRGB"
              >
                <feMorphology
                  in="SourceGraphic"
                  operator="erode"
                  radius="2.5"
                  result="areaMaskInset"
                />
                <feGaussianBlur
                  in="areaMaskInset"
                  stdDeviation="14"
                  result="areaMaskBlur"
                />
                <feComposite
                  in="areaMaskBlur"
                  in2="SourceGraphic"
                  operator="in"
                  result="areaMaskSoft"
                />
              </filter>
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
                {/*
                  Hide general-ring stroke where it overlaps anterior/posterior subparts.
                */}
                {NECK_FILL_HIT_IDS.map((hitId) => {
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
              {NECK_FILL_HIT_IDS.map((hitId) => {
                const spec = shapeByHit.get(hitId);
                if (!spec) return null;
                const softMaskId = `neck-detail-area-soft-${uid}-${hitId}`;
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
                {neckRawDotsContoursByHit.map((entry) => {
                  const softMaskId = `neck-detail-area-soft-${uid}-${entry.hitId}`;
                  const partCount = countsByHit[entry.hitId] ?? 0;
                  const fillColor = detailAreaPinkForCount(
                    partCount,
                    countsByHit,
                    NECK_FILL_HIT_IDS,
                  );
                  const globalMax =
                    neckRawDotsGlobalContourMaxValue <= 0
                      ? 1
                      : neckRawDotsGlobalContourMaxValue;
                  return (
                    <g
                      key={`neck-raw-area-${entry.hitId}`}
                      mask={`url(#${softMaskId})`}
                    >
                      <g filter={`url(#${rawDotsSoftBlurId})`}>
                        {entry.contours.map(
                          (contour: ContourMultiPolygon, i: number) => {
                            const d = neckRawDotsContourPath(contour);
                            if (!d) return null;
                            const value = contour.value ?? 0;
                            const normalized = Math.min(
                              1,
                              Math.max(0, value / globalMax),
                            );
                            const contrastAdjusted = Math.pow(normalized, 1.35);
                            const opacity = detailAreaContourOpacity(
                              contrastAdjusted,
                              partCount,
                              countsByHit,
                              NECK_FILL_HIT_IDS,
                            );
                            return (
                              <path
                                key={`neck-raw-density-${entry.hitId}-${i}`}
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
                {neckRawDotsContoursByHit.length === 0
                  ? NECK_FILL_HIT_IDS.map((hitId) => {
                      const softMaskId = `neck-detail-area-soft-${uid}-${hitId}`;
                      const pts = dotsByHitId[hitId] ?? [];
                      if (pts.length === 0) return null;
                      const partCount = countsByHit[hitId] ?? 0;
                      const fillColor = detailAreaPinkForCount(
                        partCount,
                        countsByHit,
                        NECK_FILL_HIT_IDS,
                      );
                      const fallbackOpacity = detailAreaContourOpacity(
                        1,
                        partCount,
                        countsByHit,
                        NECK_FILL_HIT_IDS,
                      );
                      return (
                        <g
                          key={`neck-raw-fallback-wrap-${hitId}`}
                          mask={`url(#${softMaskId})`}
                        >
                          <g filter={`url(#${rawDotsSoftBlurId})`}>
                            {pts.map((p, i) => (
                              <circle
                                key={`neck-raw-fallback-${hitId}-${i}`}
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

            {NECK_FILL_HIT_IDS.map((hitId) => {
              const spec = shapeByHit.get(hitId);
              if (!spec) return null;
              const selected =
                !suppressSelectedFineFillWhileGeneralHover &&
                isBodyMapChipSelected("neck", hitId);
              const active =
                hoveredHitId === hitId || selected;
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
                {NECK_FILL_HIT_IDS.flatMap((hitId) => {
                  const pts = dotsByHitId[hitId] ?? [];
                  const c = countsByHit[hitId] ?? 0;
                  const t = countToPerceptualNormalized(c, countColorDomain);
                  const tAdj = heatmapContrastT(t);
                  const opacity =
                    HEATMAP_DOT_OPACITY_MIN +
                    (HEATMAP_DOT_OPACITY_MAX - HEATMAP_DOT_OPACITY_MIN) * tAdj;
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
              strokeOpacity={generalRingHovered ? 1 : generalRingActive ? 0.92 : 1}
              strokeWidth={NECK_GENERAL_RING_STROKE_WIDTH}
              vectorEffect="nonScalingStroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="stroke"
              mask={`url(#${generalRingMaskId})`}
              style={{ cursor: "pointer" }}
              onPointerEnter={(e) => {
                setHoveredHitId("general");
                setTooltip({
                  label: NECK_HIT_LABELS.general,
                  count: countsByHit.general ?? 0,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
              onPointerMove={handleMove}
              onPointerLeave={clearHover}
              onClick={() => toggleBodyMapChip("neck", "general")}
              aria-label="Neck general (outline)"
            />
          </svg>
        ) : null}
      </div>

      {neckSvgText && silhouetteD && generalOutlineD && !neckParseError ? (
        <BodyMapHeatmapLegend
          variant={variant}
          colorDomain={countColorDomain}
          gradientId={`${uid}-neck-legend-${variant}`}
          className="neck-detail-legend"
          caption={
            variant === "countHeatmap"
              ? `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Hover subregions or the outline for whole-neck (general).`
              : `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Uses the same d3 density smoothing as the full-body map. Hover the outline for whole-neck (general).`
          }
        />
      ) : null}

      {tooltip ? (
        <div
          className="body-map-tooltip"
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <div className="body-map-tooltip-title">{tooltip.label}</div>
          <div>{tooltip.count} papers</div>
        </div>
      ) : null}
    </div>
  );
}
