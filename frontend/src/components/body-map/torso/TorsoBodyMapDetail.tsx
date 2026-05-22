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
  buildTorsoAreaDensityDotsByHitId,
  buildTorsoDotsByHitId,
  TORSO_DETAIL_VIEWBOX,
  type TorsoShapeSpec,
} from "./torsoDetailSampleDots";
import type { BodyMapVariant } from "../bodyMapVariant";
import { countToPerceptualNormalized } from "../bodyMapVisualization";
import {
  paperMatchesTorsoFineSelection,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

/** Smaller than full-body dots so subregions on the torso SVG read more clearly. */
const HEATMAP_DOT_RADIUS = 50;
const HEATMAP_DOT_OPACITY_MIN = 0.22;
const HEATMAP_DOT_OPACITY_MAX = 0.52;
const MAX_HEATMAP_DOTS_PER_HIT = 500;

/** Finer grid + more thresholds smooth density contour edges in Area view. */
const TORSO_RAW_DOTS_DENSITY_BANDWIDTH = 70;
const TORSO_RAW_DOTS_DENSITY_CELL_SIZE = 2;
const TORSO_RAW_DOTS_DENSITY_THRESHOLDS = 30;

/** Static `Base` silhouette stroke (`silhouetteD` path). */
const TORSO_SILHOUETTE_STROKE_WIDTH = 4;

/** General hover/select ring on `Torso` path (`generalOutlineD`). */
const TORSO_GENERAL_RING_STROKE_WIDTH = 25;

/** Fill hit ids in paint order (later = on top for pointer priority). */
const TORSO_FILL_HIT_IDS = ["chest", "abdomen", "shoulder"] as const;

const TORSO_COUNT_HIT_IDS = ["general", ...TORSO_FILL_HIT_IDS, "back"] as const;

const TORSO_HIT_LABELS: Record<string, string> = {
  general: "General",
  chest: "Chest",
  abdomen: "Abdomen",
  shoulder: "Shoulder",
  back: "Back",
};

function heatmapContrastT(t: number): number {
  return Math.pow(Math.min(1, Math.max(0, t)), 0.72);
}

type TooltipState = { label: string; count: number; x: number; y: number };

type TorsoPathLayer = { d: string; transform?: string; layerKey: string };

function torsoSpecLayers(
  hitId: string,
  spec: TorsoShapeSpec,
): TorsoPathLayer[] {
  if (spec.kind === "path-union") {
    return spec.paths.map((p, i) => ({
      d: p.d,
      transform: p.transform,
      layerKey: `${hitId}-${i}`,
    }));
  }
  if (spec.kind === "path") {
    return [{ d: spec.d, transform: spec.transform, layerKey: hitId }];
  }
  return [];
}

function readTorsoPath(
  doc: Document,
  id: string,
): { d: string; transform?: string } {
  const pathEl = doc.querySelector(`path[id="${id}"]`);
  const d = pathEl?.getAttribute("d")?.trim();
  if (!d) {
    throw new Error(`Torso map SVG: expected path[id="${id}"].`);
  }
  return { d, transform: pathEl?.getAttribute("transform") ?? undefined };
}

/** Single asset: `torso-subpart-outline.svg` (Base, Torso outline, subparts). */
function parseTorsoDetailSvg(svgText: string): {
  silhouetteD: string;
  generalOutlineD: string;
  shapeByHit: Map<string, TorsoShapeSpec>;
} {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const silhouetteD = readTorsoPath(doc, "Base").d;
  const generalOutlineD = readTorsoPath(doc, "Torso").d;

  const shapeByHit = new Map<string, TorsoShapeSpec>();
  shapeByHit.set("chest", { kind: "path", ...readTorsoPath(doc, "Chest") });
  shapeByHit.set("abdomen", { kind: "path", ...readTorsoPath(doc, "Abdomen") });
  shapeByHit.set("shoulder", {
    kind: "path-union",
    paths: [
      readTorsoPath(doc, "LeftShoulder"),
      readTorsoPath(doc, "RightShoulder"),
    ],
  });

  return {
    silhouetteD,
    generalOutlineD,
    shapeByHit,
  };
}

export type TorsoBodyMapDetailProps = {
  variant: BodyMapVariant;
  papers: readonly ResearchPaper[];
  selectedFineSubregion: string | null;
  onSelectFine: (fine: string | null) => void;
  onBack: () => void;
};

export function TorsoBodyMapDetail({
  variant,
  papers,
  selectedFineSubregion,
  onSelectFine,
  onBack,
}: TorsoBodyMapDetailProps) {
  const uid = useId().replace(/:/g, "");
  const hoverGradientId = `torso-detail-hover-${uid}`;
  const softFillFilterId = `torso-detail-soft-${uid}`;
  const heatDotRadialGradientId = `torso-detail-heat-radial-${uid}`;
  const generalRingMaskId = `torso-detail-general-mask-${uid}`;
  const rawDotsSoftBlurId = `torso-detail-raw-dots-soft-blur-${uid}`;
  const areaMaskFeatherFilterId = `torso-detail-area-mask-feather-${uid}`;

  const [torsoSvgText, setTorsoSvgText] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredHitId, setHoveredHitId] = useState<string | null>(null);
  const [dotsByHitId, setDotsByHitId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});

  const torsoAreaDotsSampleCacheRef = useRef<
    Map<string, Record<string, { x: number; y: number }[]>>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/body-map/torso-subpart-outline.svg")
      .then((r) => {
        if (!r.ok) throw new Error(`torso map HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setTorsoSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setTorsoSvgText("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const torsoParse = useMemo(() => {
    if (!torsoSvgText) {
      return {
        silhouetteD: "",
        generalOutlineD: "",
        shapeByHit: new Map<string, TorsoShapeSpec>(),
        error: null as string | null,
      };
    }
    try {
      const parsed = parseTorsoDetailSvg(torsoSvgText);
      return {
        ...parsed,
        error: null as string | null,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        silhouetteD: "",
        generalOutlineD: "",
        shapeByHit: new Map<string, TorsoShapeSpec>(),
        error: msg,
      };
    }
  }, [torsoSvgText]);

  const {
    silhouetteD,
    generalOutlineD,
    shapeByHit,
    error: torsoParseError,
  } = torsoParse;

  const paperIdsKey = useMemo(
    () => papers.map((p) => p.id).join("\0"),
    [papers],
  );

  const shapeByHitKey = useMemo(
    () => [...shapeByHit.keys()].sort().join("\0"),
    [shapeByHit],
  );

  const countsByHit = useMemo(() => {
    const m: Record<string, number> = {};
    for (const k of TORSO_COUNT_HIT_IDS) {
      m[k] = papers.filter((p) => paperMatchesTorsoFineSelection(p, k)).length;
    }
    return m;
  }, [papers, paperIdsKey]);

  const countColorDomain = useMemo<[number, number]>(() => {
    const vals = [...TORSO_FILL_HIT_IDS.map((id) => countsByHit[id] ?? 0)];
    const maxVal = Math.max(0, ...vals);
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [countsByHit]);

  const torsoRawDotsContoursByHit = useMemo(() => {
    if (variant !== "rawDots") return [];
    const vbParts = TORSO_DETAIL_VIEWBOX.split(/\s+/).map(Number);
    const vbW = vbParts[2] ?? 210;
    const vbH = vbParts[3] ?? 297;
    const vbY = vbParts[1] ?? 0;
    const density = contourDensity<{ x: number; y: number }>()
      .x((d: { x: number; y: number }) => d.x)
      .y((d: { x: number; y: number }) => d.y)
      .size([vbW, vbY + vbH])
      .cellSize(TORSO_RAW_DOTS_DENSITY_CELL_SIZE)
      .bandwidth(TORSO_RAW_DOTS_DENSITY_BANDWIDTH)
      .thresholds(TORSO_RAW_DOTS_DENSITY_THRESHOLDS);
    return TORSO_FILL_HIT_IDS.flatMap((hitId) => {
      const points = dotsByHitId[hitId] ?? [];
      if (points.length < 2) return [];
      return [{ hitId, contours: density(points) }];
    });
  }, [dotsByHitId, variant]);

  const torsoRawDotsGlobalContourMaxValue = useMemo(() => {
    return Math.max(
      0,
      ...torsoRawDotsContoursByHit.flatMap((entry) =>
        entry.contours.map((c: ContourMultiPolygon) => c.value ?? 0),
      ),
    );
  }, [torsoRawDotsContoursByHit]);

  const torsoRawDotsContourPath = useMemo(() => geoPath(), []);

  const torsoRawDotsLegendTicks = useMemo(() => {
    const lo = countColorDomain[0];
    const hi = countColorDomain[1];
    const mid = lo + (hi - lo) / 2;
    return [lo, mid, hi].map((v) => Math.round(v));
  }, [countColorDomain]);

  useLayoutEffect(() => {
    if (!shapeByHit.size) return;
    let cancelled = false;
    const areaCacheKey = `${paperIdsKey}\0${shapeByHitKey}`;

    if (variant === "rawDots") {
      const cached = areaDotsLruTouch(
        torsoAreaDotsSampleCacheRef.current,
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
        ? buildTorsoAreaDensityDotsByHitId(
            papers,
            shapeByHit,
            MAX_HEATMAP_DOTS_PER_HIT,
          )
        : buildTorsoDotsByHitId(papers, shapeByHit, MAX_HEATMAP_DOTS_PER_HIT);

    if (variant === "rawDots") {
      areaDotsLruPut(
        torsoAreaDotsSampleCacheRef.current,
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
          label: TORSO_HIT_LABELS[hitId] ?? hitId,
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
      const cur = selectedFineSubregion?.trim().toLowerCase() ?? "";
      if (cur === hitId.toLowerCase()) onSelectFine(null);
      else onSelectFine(hitId);
    },
    [onSelectFine, selectedFineSubregion],
  );

  const generalRingHovered = hoveredHitId === "general";
  const generalRingActive =
    generalRingHovered || selectedFineSubregion?.toLowerCase() === "general";

  /** Avoid stacking a thick General ring on top of a selected fine fill. */
  const suppressSelectedFineFillWhileGeneralHover =
    generalRingHovered &&
    !!selectedFineSubregion?.trim() &&
    selectedFineSubregion.trim().toLowerCase() !== "general";

  const vbParts = TORSO_DETAIL_VIEWBOX.split(/\s+/).map(Number);
  const vbW = vbParts[2] ?? 438.83116;
  const vbH = vbParts[3] ?? 564;

  return (
    <div className="body-map-root torso-detail-root">
      <div className="body-map-svg-wrap torso-detail-svg-wrap">
        <button
          type="button"
          className="torso-detail-back"
          onClick={onBack}
          aria-label="Back to full body map"
        >
          ← Full body
        </button>
        {torsoParseError ? (
          <p className="torso-detail-error" role="alert">
            {torsoParseError}
          </p>
        ) : null}
        {torsoSvgText === null ? (
          <p className="torso-detail-loading">Loading torso map…</p>
        ) : null}
        {torsoSvgText === "" ? (
          <p className="torso-detail-error" role="alert">
            Could not load torso map SVG.
          </p>
        ) : null}
        {torsoSvgText && silhouetteD && generalOutlineD && !torsoParseError ? (
          <svg
            className="body-map-svg torso-detail-svg"
            width="100%"
            height="100%"
            viewBox={TORSO_DETAIL_VIEWBOX}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Torso detail body map: subregions for filtered papers"
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
                  Hide general-ring stroke where it overlaps chest / abdomen / shoulder.
                */}
                {TORSO_FILL_HIT_IDS.flatMap((hitId) => {
                  const spec = shapeByHit.get(hitId);
                  if (!spec) return [];
                  return torsoSpecLayers(hitId, spec).map((layer) => (
                    <path
                      key={`general-mask-${layer.layerKey}`}
                      d={layer.d}
                      transform={layer.transform}
                      fill="black"
                    />
                  ));
                })}
              </mask>
              {TORSO_FILL_HIT_IDS.map((hitId) => {
                const spec = shapeByHit.get(hitId);
                if (!spec) return null;
                const softMaskId = `torso-detail-area-soft-${uid}-${hitId}`;
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
                    {torsoSpecLayers(hitId, spec).map((layer) => (
                      <path
                        key={`area-mask-${layer.layerKey}`}
                        d={layer.d}
                        transform={layer.transform}
                        fill="white"
                        filter={`url(#${areaMaskFeatherFilterId})`}
                      />
                    ))}
                  </mask>
                );
              })}
            </defs>

            <path
              d={silhouetteD}
              fill="none"
              stroke="#1e293b"
              strokeOpacity={0.45}
              strokeWidth={TORSO_SILHOUETTE_STROKE_WIDTH}
              vectorEffect="nonScalingStroke"
              pointerEvents="none"
            />

            {variant === "rawDots" ? (
              <g pointerEvents="none" aria-hidden>
                {torsoRawDotsContoursByHit.map((entry) => {
                  const softMaskId = `torso-detail-area-soft-${uid}-${entry.hitId}`;
                  const partCount = countsByHit[entry.hitId] ?? 0;
                  const countStrength = countToPerceptualNormalized(
                    partCount,
                    countColorDomain,
                  );
                  const countBoost = 0.35 + Math.pow(countStrength, 0.9) * 0.65;
                  const globalMax =
                    torsoRawDotsGlobalContourMaxValue <= 0
                      ? 1
                      : torsoRawDotsGlobalContourMaxValue;
                  return (
                    <g
                      key={`torso-raw-area-${entry.hitId}`}
                      mask={`url(#${softMaskId})`}
                    >
                      <g filter={`url(#${rawDotsSoftBlurId})`}>
                        {entry.contours.map(
                          (contour: ContourMultiPolygon, i: number) => {
                            const d = torsoRawDotsContourPath(contour);
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
                                key={`torso-raw-density-${entry.hitId}-${i}`}
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
                {torsoRawDotsContoursByHit.length === 0
                  ? TORSO_FILL_HIT_IDS.map((hitId) => {
                      const softMaskId = `torso-detail-area-soft-${uid}-${hitId}`;
                      const pts = dotsByHitId[hitId] ?? [];
                      if (pts.length === 0) return null;
                      return (
                        <g
                          key={`torso-raw-fallback-wrap-${hitId}`}
                          mask={`url(#${softMaskId})`}
                        >
                          <g filter={`url(#${rawDotsSoftBlurId})`}>
                            {pts.map((p, i) => (
                              <circle
                                key={`torso-raw-fallback-${hitId}-${i}`}
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

            {TORSO_FILL_HIT_IDS.flatMap((hitId) => {
              const spec = shapeByHit.get(hitId);
              if (!spec) return [];
              const selected =
                !suppressSelectedFineFillWhileGeneralHover &&
                selectedFineSubregion?.toLowerCase() === hitId.toLowerCase();
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
              return torsoSpecLayers(hitId, spec).map((layer) => (
                <path
                  key={layer.layerKey}
                  d={layer.d}
                  transform={layer.transform}
                  {...common}
                />
              ));
            })}

            {variant === "countHeatmap" ? (
              <g pointerEvents="none">
                {TORSO_FILL_HIT_IDS.flatMap((hitId) => {
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
              strokeWidth={TORSO_GENERAL_RING_STROKE_WIDTH}
              vectorEffect="nonScalingStroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="stroke"
              mask={`url(#${generalRingMaskId})`}
              style={{ cursor: "pointer" }}
              onPointerEnter={(e) => {
                setHoveredHitId("general");
                setTooltip({
                  label: TORSO_HIT_LABELS.general,
                  count: countsByHit.general ?? 0,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
              onPointerMove={handleMove}
              onPointerLeave={clearHover}
              onClick={() => toggleFine("general")}
              aria-label="Torso general (outline)"
            />
          </svg>
        ) : null}
      </div>

      {variant === "rawDots" &&
      torsoSvgText &&
      silhouetteD &&
      generalOutlineD &&
      !torsoParseError ? (
        <div className="body-map-heatmap-legend torso-detail-legend">
          <svg
            width="100%"
            height="18"
            role="img"
            aria-label="Density strength gradient legend"
          >
            <defs>
              <linearGradient
                id={`${uid}-torso-raw-legend-strip`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#ffe4e6" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
            </defs>
            <rect
              x="0"
              y="2"
              width="100%"
              height="10"
              rx="5"
              fill={`url(#${uid}-torso-raw-legend-strip)`}
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
            <span>{torsoRawDotsLegendTicks[0].toLocaleString()}</span>
            <span>{torsoRawDotsLegendTicks[1].toLocaleString()}</span>
            <span>{torsoRawDotsLegendTicks[2].toLocaleString()}</span>
          </div>
          <p className="body-map-heatmap-legend-caption">
            Paper count (low to high): {countColorDomain[0].toLocaleString()} to{" "}
            {countColorDomain[1].toLocaleString()}. Uses the same d3 density
            smoothing as the full-body map. Hover the outline for whole-torso
            (general).
          </p>
        </div>
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
