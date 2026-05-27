import type { BodyMapVariant } from "@/components/body-map/bodyMapVariant";
import { interpolatePinkDensityTone } from "@/components/body-map/shared/bodyMapHeatmapColors";

export function legendEndpointTicks(
  colorDomain: readonly [number, number],
): [number, number] {
  return [Math.round(colorDomain[0]), Math.round(colorDomain[1])];
}

type BodyMapHeatmapLegendProps = {
  variant: BodyMapVariant;
  colorDomain: readonly [number, number];
  gradientId: string;
  caption: string;
  className?: string;
};

export function BodyMapHeatmapLegend({
  variant,
  colorDomain,
  gradientId,
  caption,
  className,
}: BodyMapHeatmapLegendProps) {
  const [lo, hi] = legendEndpointTicks(colorDomain);
  const ariaLabel =
    variant === "countHeatmap"
      ? "Paper density gradient legend"
      : "Density strength gradient legend";

  return (
    <div
      className={["body-map-heatmap-legend", className].filter(Boolean).join(" ")}
    >
      <svg width="100%" height="18" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {variant === "countHeatmap" || variant === "rawDots" ? (
              <>
                <stop offset="0%" stopColor={interpolatePinkDensityTone(0)} />
                <stop offset="100%" stopColor={interpolatePinkDensityTone(1)} />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ffe4e6" />
                <stop offset="100%" stopColor="#db2777" />
              </>
            )}
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="2"
          width="100%"
          height="10"
          rx="5"
          fill={`url(#${gradientId})`}
        />
      </svg>
      <div className="body-map-heatmap-legend-ticks" aria-hidden>
        <span>{lo.toLocaleString()}</span>
        <span>{hi.toLocaleString()}</span>
      </div>
      <p className="body-map-heatmap-legend-caption">{caption}</p>
    </div>
  );
}
