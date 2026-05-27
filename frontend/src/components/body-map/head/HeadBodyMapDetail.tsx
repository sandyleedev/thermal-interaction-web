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
import {
  areaDotsLruPut,
  areaDotsLruTouch,
} from "../shared/bodyMapAreaDotsCache";
import {
  buildHeadAreaDensityDotsByHitId,
  buildHeadDotsByHitId,
  HEAD_DETAIL_VIEWBOX,
  type HeadShapeSpec,
} from "./headDetailSampleDots";
import type { BodyMapVariant } from "../bodyMapVariant";
import { BodyMapHeatmapLegend } from "../shared/BodyMapHeatmapLegend";
import { countToPerceptualNormalized } from "../bodyMapVisualization";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { normalizeBodyMapSubpart } from "@/lib/research/bodyMapChipSelection";
import {
  paperMatchesHeadFineSelection,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

/** Smaller than full-body dots so subregions on the head SVG read more clearly. */
const HEATMAP_DOT_RADIUS = 28;
const HEATMAP_DOT_OPACITY_MIN = 0.12;
const HEATMAP_DOT_OPACITY_MAX = 0.32;
const MAX_HEATMAP_DOTS_PER_HIT = 500;

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

type TooltipState = { label: string; count: number; x: number; y: number };

/** Single asset: `head-subpart-outline-wide.svg` (head-face, head-outline, fine regions). */
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

export function HeadBodyMapDetail({
  variant,
  papers,
}: HeadBodyMapDetailProps) {
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

  const headAreaDotsSampleCacheRef = useRef<
    Map<string, Record<string, { x: number; y: number }[]>>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/body-map/head-subpart-outline-wide.svg")
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
      m[k] = papers.filter((p) => paperMatchesHeadFineSelection(p, k)).length;
    }
    return m;
  }, [papers, paperIdsKey]);

  const countColorDomain = useMemo<[number, number]>(() => {
    const vals = [...HEAD_FILL_HIT_IDS.map((id) => countsByHit[id] ?? 0)];
    const maxVal = Math.max(0, ...vals);
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [countsByHit]);

  const headRawDotsContoursByHit = useMemo(() => {
    if (variant !== "rawDots") return [];
    const vbParts = HEAD_DETAIL_VIEWBOX.split(/\s+/).map(Number);
    const vbW = vbParts[2] ?? 210;
    const vbH = vbParts[3] ?? 297;
    const vbY = vbParts[1] ?? 0;
    const density = contourDensity<{ x: number; y: number }>()
      .x((d: { x: number; y: number }) => d.x)
      .y((d: { x: number; y: number }) => d.y)
      .size([vbW, vbY + vbH])
      .cellSize(HEAD_RAW_DOTS_DENSITY_CELL_SIZE)
      .bandwidth(HEAD_RAW_DOTS_DENSITY_BANDWIDTH)
      .thresholds(HEAD_RAW_DOTS_DENSITY_THRESHOLDS);
    return HEAD_FILL_HIT_IDS.flatMap((hitId) => {
      const points = dotsByHitId[hitId] ?? [];
      if (points.length < 2) return [];
      return [{ hitId, contours: density(points) }];
    });
  }, [dotsByHitId, variant]);

  const headRawDotsGlobalContourMaxValue = useMemo(() => {
    return Math.max(
      0,
      ...headRawDotsContoursByHit.flatMap((entry) =>
        entry.contours.map((c: ContourMultiPolygon) => c.value ?? 0),
      ),
    );
  }, [headRawDotsContoursByHit]);

  const headRawDotsContourPath = useMemo(() => geoPath(), []);

  useLayoutEffect(() => {
    if (!shapeByHit.size) return;
    let cancelled = false;
    const areaCacheKey = `${paperIdsKey}\0${shapeByHitKey}`;

    if (variant === "rawDots") {
      const cached = areaDotsLruTouch(
        headAreaDotsSampleCacheRef.current,
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
          label: HEAD_HIT_LABELS[hitId] ?? hitId,
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
                {headRawDotsContoursByHit.map((entry) => {
                  const softMaskId = `head-detail-area-soft-${uid}-${entry.hitId}`;
                  const partCount = countsByHit[entry.hitId] ?? 0;
                  const countStrength = countToPerceptualNormalized(
                    partCount,
                    countColorDomain,
                  );
                  const countBoost = 0.35 + Math.pow(countStrength, 0.9) * 0.65;
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
                            const contrastAdjusted = Math.pow(normalized, 1.45);
                            const opacity =
                              (0.012 + contrastAdjusted * 0.78) * countBoost;
                            return (
                              <path
                                key={`head-raw-density-${entry.hitId}-${i}`}
                                d={d}
                                fill="#db2777"
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
                {headRawDotsContoursByHit.length === 0
                  ? HEAD_FILL_HIT_IDS.map((hitId) => {
                      const softMaskId = `head-detail-area-soft-${uid}-${hitId}`;
                      const pts = dotsByHitId[hitId] ?? [];
                      if (pts.length === 0) return null;
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
                                fill="#db2777"
                                fillOpacity={0.42}
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
              const active = hoveredHitId === hitId || selected;
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
                setTooltip({
                  label: HEAD_HIT_LABELS.general,
                  count: countsByHit.general ?? 0,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
              onPointerMove={handleMove}
              onPointerLeave={clearHover}
              onClick={() => toggleBodyMapChip("head", "general")}
              aria-label="Head general (outline)"
            />
          </svg>
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
