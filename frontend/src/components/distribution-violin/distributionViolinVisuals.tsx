/** Match body-map heat scale: #ffe4e6 → #db2777 */
export const DISTRIBUTION_PINK_LIGHT = "#ffe4e6";
export const DISTRIBUTION_PINK_VIVID = "#db2777";

export type DistributionViolinVisualIds = {
  clipId: string;
  areaGradientId: string;
  selectionGradientId: string;
  softBlurId: string;
};

export function distributionViolinVisualIds(baseId: string): DistributionViolinVisualIds {
  return {
    clipId: `distribution-violin-clip-${baseId}`,
    areaGradientId: `distribution-violin-area-grad-${baseId}`,
    selectionGradientId: `distribution-violin-selection-grad-${baseId}`,
    softBlurId: `distribution-violin-soft-blur-${baseId}`,
  };
}

type DistributionViolinDefsProps = {
  ids: DistributionViolinVisualIds;
  yTop: number;
  yBottom: number;
};

/** SVG gradients + blur used by temperature/duration distribution violins. */
export function DistributionViolinDefs({
  ids,
  yTop,
  yBottom,
}: DistributionViolinDefsProps) {
  return (
    <>
      <linearGradient
        id={ids.areaGradientId}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1={yBottom}
        x2="0"
        y2={yTop}
      >
        <stop offset="0%" stopColor={DISTRIBUTION_PINK_LIGHT} stopOpacity={0.35} />
        <stop offset="48%" stopColor="#f9a8d4" stopOpacity={0.58} />
        <stop offset="100%" stopColor={DISTRIBUTION_PINK_VIVID} stopOpacity={0.78} />
      </linearGradient>
      <linearGradient
        id={ids.selectionGradientId}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1={yBottom}
        x2="0"
        y2={yTop}
      >
        <stop offset="0%" stopColor={DISTRIBUTION_PINK_LIGHT} stopOpacity={0.52} />
        <stop offset="48%" stopColor="#f472b6" stopOpacity={0.78} />
        <stop offset="100%" stopColor={DISTRIBUTION_PINK_VIVID} stopOpacity={0.94} />
      </linearGradient>
      <filter
        id={ids.softBlurId}
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" />
      </filter>
    </>
  );
}
