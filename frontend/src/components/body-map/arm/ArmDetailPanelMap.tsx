import { useMemo, type PointerEvent, type SVGProps } from "react";
import { geoPath } from "d3";
import type { ContourMultiPolygon } from "d3-contour";
import type { ArmShapeSpec } from "./armDetailSampleDots";
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

type ShapeLayer =
  | { kind: "path"; d: string; transform?: string; layerKey: string }
  | {
      kind: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      transform?: string;
      layerKey: string;
    };

function specToLayers(hitId: string, spec: ArmShapeSpec): ShapeLayer[] {
  if (spec.kind === "path") {
    return [
      { kind: "path", d: spec.d, transform: spec.transform, layerKey: hitId },
    ];
  }
  return [
    {
      kind: "ellipse",
      cx: spec.cx,
      cy: spec.cy,
      rx: spec.rx,
      ry: spec.ry,
      transform: spec.transform,
      layerKey: hitId,
    },
  ];
}

function ShapeLayerGraphic({
  layer,
  layerTransform,
  ...rest
}: {
  layer: ShapeLayer;
  layerTransform: (transform?: string) => string | undefined;
} & SVGProps<SVGPathElement & SVGEllipseElement>) {
  const transform = layerTransform(layer.transform);
  if (layer.kind === "path") {
    return <path d={layer.d} transform={transform} {...rest} />;
  }
  return (
    <ellipse
      cx={layer.cx}
      cy={layer.cy}
      rx={layer.rx}
      ry={layer.ry}
      transform={transform}
      {...rest}
    />
  );
}

function heatmapContrastT(t: number): number {
  return Math.pow(Math.min(1, Math.max(0, t)), 0.72);
}

export type ArmDetailPanelMapProps = {
  sideLabel: string;
  viewBox: string;
  svgClassName: string;
  ariaLabel: string;
  idPrefix: string;
  variant: BodyMapVariant;
  silhouetteD: string;
  silhouetteTransform?: string;
  generalOutlineD: string;
  generalOutlineTransform?: string;
  shapeByHit: Map<string, ArmShapeSpec>;
  fillHitIds: readonly string[];
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
  hoveredHitIds?: readonly string[];
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
  horizontalFlip?: boolean;
  interactiveFillHitIds?: readonly string[];
  /** When false, the outline ring is omitted (e.g. outer hand = single hand-back region). */
  showGeneralRing?: boolean;
};

export function ArmDetailPanelMap({
  sideLabel,
  viewBox,
  svgClassName,
  ariaLabel,
  idPrefix,
  variant,
  silhouetteD,
  silhouetteTransform,
  generalOutlineD,
  generalOutlineTransform,
  shapeByHit,
  fillHitIds,
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
  hoveredHitIds,
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
  horizontalFlip = false,
  interactiveFillHitIds,
  showGeneralRing = true,
}: ArmDetailPanelMapProps) {
  const hoverGradientId = `${idPrefix}-hover`;
  const softFillFilterId = `${idPrefix}-soft`;
  const heatDotRadialGradientId = `${idPrefix}-heat-radial`;
  const generalRingMaskId = `${idPrefix}-general-mask`;
  const rawDotsSoftBlurId = `${idPrefix}-raw-dots-soft-blur`;
  const areaMaskFeatherFilterId = `${idPrefix}-area-mask-feather`;

  const vbParts = viewBox.split(/\s+/).map(Number);
  const vbW = vbParts[2] ?? 281;
  const vbH = vbParts[3] ?? 750;

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
        buildDetailAreaDensityContoursByHit(fillHitIds, dotsByHitId, viewBox, {
          cellSize: rawDotsDensityCellSize,
          bandwidth: rawDotsDensityBandwidth,
          thresholds: rawDotsDensityThresholds,
        }),
      [
        areaDotsKey,
        dotsByHitId,
        fillHitIds,
        rawDotsDensityBandwidth,
        rawDotsDensityCellSize,
        rawDotsDensityThresholds,
        viewBox,
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

  const contentFlipTransform = horizontalFlip
    ? `translate(${vbW}, 0) scale(-1, 1)`
    : undefined;

  const layerTransform = (transform?: string) => {
    if (!contentFlipTransform) return transform;
    if (!transform) return contentFlipTransform;
    return `${contentFlipTransform} ${transform}`;
  };

  const pointerFillHitIds = interactiveFillHitIds ?? fillHitIds;

  const renderPointerFillHits = (keyPrefix: string) =>
    pointerFillHitIds.flatMap((hitId) => {
      const spec = shapeByHit.get(hitId);
      if (!spec) return [];
      const selected =
        !suppressSelectedFineFillWhileGeneralHover && isHitSelected(hitId);
      const active =
        (hoveredHitIds?.includes(hitId) ?? hoveredHitId === hitId) || selected;
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
      return specToLayers(hitId, spec).map((layer) => (
        <ShapeLayerGraphic
          key={`${keyPrefix}${layer.layerKey}`}
          layer={layer}
          layerTransform={layerTransform}
          {...common}
        />
      ));
    });

  return (
    <svg
      className={svgClassName}
      width="100%"
      height="auto"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient
          id={hoverGradientId}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={0}
          x2={vbW}
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
              return specToLayers(hitId, spec).map((layer) => (
                <ShapeLayerGraphic
                  key={`general-mask-${layer.layerKey}`}
                  layer={layer}
                  layerTransform={layerTransform}
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
              {specToLayers(hitId, spec).map((layer) => (
                <ShapeLayerGraphic
                  key={`area-mask-${layer.layerKey}`}
                  layer={layer}
                  layerTransform={layerTransform}
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
        transform={layerTransform(silhouetteTransform)}
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
              <g key={`raw-area-${entry.hitId}`} mask={`url(#${softMaskId})`}>
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
                          key={`raw-density-${entry.hitId}-${i}`}
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
                    key={`raw-fallback-wrap-${hitId}`}
                    mask={`url(#${softMaskId})`}
                  >
                    <g filter={`url(#${rawDotsSoftBlurId})`}>
                      {pts.map((p, i) => (
                        <circle
                          key={`raw-fallback-${hitId}-${i}`}
                          cx={p.x}
                          cy={p.y}
                          r={3.2}
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

      {showGeneralRing ? renderPointerFillHits("") : null}

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
                key={`${hitId}-${i}`}
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

      {!showGeneralRing ? renderPointerFillHits("top-") : null}

      {showGeneralRing ? (
        <>
          {/* Hit target: ring excludes subpart interiors so fine regions stay clickable. */}
          <path
            d={generalOutlineD}
            transform={layerTransform(generalOutlineTransform)}
            fill="none"
            stroke="transparent"
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
            aria-label={`${sideLabel} arm general (outline)`}
          />
          {/* Visual: full hand–shoulder outline without mask (avoids gaps at subpart seams). */}
          {generalRingActive || generalRingHovered ? (
            <path
              d={generalOutlineD}
              transform={layerTransform(generalOutlineTransform)}
              fill="none"
              stroke="#fbcfe8"
              strokeOpacity={generalRingHovered ? 1 : 0.92}
              strokeWidth={generalRingStrokeWidth}
              vectorEffect="nonScalingStroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
              aria-hidden
            />
          ) : null}
        </>
      ) : null}
    </svg>
  );
}
