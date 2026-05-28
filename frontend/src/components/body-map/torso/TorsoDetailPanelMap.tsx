import { useMemo, type PointerEvent } from "react";
import { geoPath } from "d3";
import type { ContourMultiPolygon } from "d3-contour";
import {
  TORSO_DETAIL_VIEWBOX,
  type TorsoShapeSpec,
} from "./torsoDetailSampleDots";
import type { BodyMapVariant } from "../bodyMapVariant";
import { countToPerceptualNormalized } from "../bodyMapVisualization";
import {
  detailAreaContourOpacity,
  detailAreaPinkForCount,
} from "../shared/bodyMapHeatmapColors";
import { BodyMapAreaViewFilterDefs } from "../shared/BodyMapAreaViewFilterDefs";
import { useBodyMapAreaViewLoadingReporter } from "../shared/BodyMapAreaViewLoadingScope";
import { useDeferredAreaViewResult } from "../shared/useDeferredAreaViewResult";
import {
  buildDetailAreaDensityContoursByHit,
  maxContourValueFromLayers,
} from "../full-body/bodyMapAreaContours";

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

function heatmapContrastT(t: number): number {
  return Math.pow(Math.min(1, Math.max(0, t)), 0.72);
}

export type TorsoDetailPanelMapProps = {
  panel: "front" | "back";
  svgClassName: string;
  ariaLabel: string;
  idPrefix: string;
  variant: BodyMapVariant;
  silhouetteD: string;
  generalOutlineD: string;
  shapeByHit: Map<string, TorsoShapeSpec>;
  fillHitIds: readonly string[];
  showGeneralRing: boolean;
  dotsByHitId: Record<string, { x: number; y: number }[]>;
  countsByHit: Record<string, number>;
  countColorDomain: [number, number];
  heatmapDotRadius: number;
  heatmapDotOpacityMin: number;
  heatmapDotOpacityMax: number;
  silhouetteStrokeWidth: number;
  generalRingStrokeWidth: number;
  rawDotsDensityBandwidth: number;
  rawDotsDensityCellSize: number;
  rawDotsDensityThresholds: number;
  hoveredHitId: string | null;
  isHitSelected: (hitId: string) => boolean;
  suppressSelectedFineFillWhileGeneralHover: boolean;
  onFillHitEnter: (hitId: string) => (e: PointerEvent<SVGElement>) => void;
  onPointerMove: (e: PointerEvent<SVGElement>) => void;
  onPointerLeave: () => void;
  onToggleHit: (hitId: string) => void;
  onGeneralRingEnter: (e: PointerEvent<SVGElement>) => void;
  onGeneralRingClick: () => void;
  generalRingActive: boolean;
  generalRingHovered: boolean;
};

export function TorsoDetailPanelMap({
  panel,
  svgClassName,
  ariaLabel,
  idPrefix,
  variant,
  silhouetteD,
  generalOutlineD,
  shapeByHit,
  fillHitIds,
  showGeneralRing,
  dotsByHitId,
  countsByHit,
  countColorDomain,
  heatmapDotRadius,
  heatmapDotOpacityMin,
  heatmapDotOpacityMax,
  silhouetteStrokeWidth,
  generalRingStrokeWidth,
  rawDotsDensityBandwidth,
  rawDotsDensityCellSize,
  rawDotsDensityThresholds,
  hoveredHitId,
  isHitSelected,
  suppressSelectedFineFillWhileGeneralHover,
  onFillHitEnter,
  onPointerMove,
  onPointerLeave,
  onToggleHit,
  onGeneralRingEnter,
  onGeneralRingClick,
  generalRingActive,
  generalRingHovered,
}: TorsoDetailPanelMapProps) {
  const hoverGradientId = `${idPrefix}-hover`;
  const softFillFilterId = `${idPrefix}-soft`;
  const heatDotRadialGradientId = `${idPrefix}-heat-radial`;
  const generalRingMaskId = `${idPrefix}-general-mask`;
  const rawDotsSoftBlurId = `${idPrefix}-raw-dots-soft-blur`;
  const areaMaskFeatherFilterId = `${idPrefix}-area-mask-feather`;

  const vbParts = TORSO_DETAIL_VIEWBOX.split(/\s+/).map(Number);
  const vbW = vbParts[2] ?? 438.83116;
  const vbH = vbParts[3] ?? 564;

  const areaViewEnabled = variant === "rawDots";
  const areaDotsKey = useMemo(
    () =>
      fillHitIds
        .map((hitId) => `${hitId}:${(dotsByHitId[hitId] ?? []).length}`)
        .join("|"),
    [dotsByHitId, fillHitIds],
  );

  const { result: rawDotsContoursByHit, isComputing: isAreaContoursComputing } =
    useDeferredAreaViewResult(
      areaViewEnabled,
      () =>
        buildDetailAreaDensityContoursByHit(
          fillHitIds,
          dotsByHitId,
          TORSO_DETAIL_VIEWBOX,
          {
            cellSize: rawDotsDensityCellSize,
            bandwidth: rawDotsDensityBandwidth,
            thresholds: rawDotsDensityThresholds,
          },
        ),
      [
        areaDotsKey,
        dotsByHitId,
        fillHitIds,
        rawDotsDensityBandwidth,
        rawDotsDensityCellSize,
        rawDotsDensityThresholds,
      ],
    );

  const rawDotsGlobalContourMaxValue = useMemo(() => {
    return maxContourValueFromLayers(rawDotsContoursByHit ?? []);
  }, [rawDotsContoursByHit]);

  const rawDotsContourPath = useMemo(() => geoPath(), []);

  useBodyMapAreaViewLoadingReporter(
    `${idPrefix}-area-view`,
    areaViewEnabled && isAreaContoursComputing,
  );

  return (
    <svg
      className={svgClassName}
      width="100%"
      height="auto"
      viewBox={TORSO_DETAIL_VIEWBOX}
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient
          id={hoverGradientId}
          gradientUnits="userSpaceOnUse"
          x1={40}
          y1={0}
          x2={400}
          y2={vbH}
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
          <stop offset="0%" stopColor="#be185d" stopOpacity={1} />
          <stop offset="38%" stopColor="#db2777" stopOpacity={0.72} />
          <stop offset="72%" stopColor="#fb7185" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#ffe4e6" stopOpacity={0} />
        </radialGradient>
        <BodyMapAreaViewFilterDefs
          rawDotsSoftBlurId={rawDotsSoftBlurId}
          areaMaskFeatherFilterId={areaMaskFeatherFilterId}
        />
        {showGeneralRing ? (
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
            {fillHitIds.flatMap((hitId) => {
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
        ) : null}
        {fillHitIds.map((hitId) => {
          const spec = shapeByHit.get(hitId);
          if (!spec) return null;
          const softMaskId = `${idPrefix}-area-soft-${hitId}`;
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
        strokeWidth={silhouetteStrokeWidth}
        vectorEffect="nonScalingStroke"
        pointerEvents="none"
      />

      {variant === "rawDots" ? (
        <g pointerEvents="none" aria-hidden>
          {(rawDotsContoursByHit ?? []).map((entry) => {
            const softMaskId = `${idPrefix}-area-soft-${entry.hitId}`;
            const partCount = countsByHit[entry.hitId] ?? 0;
            const fillColor = detailAreaPinkForCount(
              partCount,
              countsByHit,
              fillHitIds,
            );
            const globalMax =
              rawDotsGlobalContourMaxValue <= 0
                ? 1
                : rawDotsGlobalContourMaxValue;
            return (
              <g
                key={`${panel}-raw-area-${entry.hitId}`}
                mask={`url(#${softMaskId})`}
              >
                <g filter={`url(#${rawDotsSoftBlurId})`}>
                  {entry.contours.map(
                    (contour: ContourMultiPolygon, i: number) => {
                      const d = rawDotsContourPath(contour);
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
                        fillHitIds,
                      );
                      return (
                        <path
                          key={`${panel}-raw-density-${entry.hitId}-${i}`}
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
          {(rawDotsContoursByHit ?? []).length === 0
            ? fillHitIds.map((hitId) => {
                const softMaskId = `${idPrefix}-area-soft-${hitId}`;
                const pts = dotsByHitId[hitId] ?? [];
                if (pts.length === 0) return null;
                const partCount = countsByHit[hitId] ?? 0;
                const fillColor = detailAreaPinkForCount(
                  partCount,
                  countsByHit,
                  fillHitIds,
                );
                const fallbackOpacity = detailAreaContourOpacity(
                  1,
                  partCount,
                  countsByHit,
                  fillHitIds,
                );
                return (
                  <g
                    key={`${panel}-raw-fallback-wrap-${hitId}`}
                    mask={`url(#${softMaskId})`}
                  >
                    <g filter={`url(#${rawDotsSoftBlurId})`}>
                      {pts.map((p, i) => (
                        <circle
                          key={`${panel}-raw-fallback-${hitId}-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={panel === "back" ? 2.8 : 3.8}
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

      {fillHitIds.flatMap((hitId) => {
        const spec = shapeByHit.get(hitId);
        if (!spec) return [];
        const selected =
          !suppressSelectedFineFillWhileGeneralHover && isHitSelected(hitId);
        const active = hoveredHitId === hitId || selected;
        const fillPaint = active ? `url(#${hoverGradientId})` : "transparent";
        const common = {
          fill: fillPaint,
          fillOpacity: active ? 0.78 : 1,
          filter: active ? `url(#${softFillFilterId})` : undefined,
          stroke: "none" as const,
          pointerEvents: "all" as const,
          style: { cursor: "pointer" as const },
          onPointerEnter: onFillHitEnter(hitId),
          onPointerMove,
          onPointerLeave,
          onClick: () => onToggleHit(hitId),
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
          {fillHitIds.flatMap((hitId) => {
            const pts = dotsByHitId[hitId] ?? [];
            const c = countsByHit[hitId] ?? 0;
            const t = countToPerceptualNormalized(c, countColorDomain);
            const tAdj = heatmapContrastT(t);
            const opacity =
              heatmapDotOpacityMin +
              (heatmapDotOpacityMax - heatmapDotOpacityMin) * tAdj;
            return pts.map((p, i) => (
              <circle
                key={`${panel}-${hitId}-${i}`}
                cx={p.x}
                cy={p.y}
                r={heatmapDotRadius}
                fill={`url(#${heatDotRadialGradientId})`}
                fillOpacity={opacity}
              />
            ));
          })}
        </g>
      ) : null}

      {showGeneralRing ? (
        <path
          d={generalOutlineD}
          fill="none"
          stroke={generalRingActive ? "#fbcfe8" : "transparent"}
          strokeOpacity={generalRingHovered ? 1 : generalRingActive ? 0.92 : 1}
          strokeWidth={generalRingStrokeWidth}
          vectorEffect="nonScalingStroke"
          strokeLinejoin="round"
          strokeLinecap="round"
          pointerEvents="stroke"
          mask={`url(#${generalRingMaskId})`}
          style={{ cursor: "pointer" }}
          onPointerEnter={onGeneralRingEnter}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onClick={onGeneralRingClick}
          aria-label="Torso general (outline)"
        />
      ) : null}
    </svg>
  );
}
