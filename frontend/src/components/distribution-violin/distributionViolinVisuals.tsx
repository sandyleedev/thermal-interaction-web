/** Violin plot — clearer rose (track stays slightly softer). */
export const DISTRIBUTION_PINK_VIVID = "rgba(199, 32, 93, 0.54)";

/** Full distribution fill. */
export const DISTRIBUTION_PINK_AREA = "rgba(255, 222, 236, 0.57)";

/** Selected range overlay. */
export const DISTRIBUTION_PINK_SELECTION = "rgba(242, 30, 108, 0.28)";

export type DistributionViolinVisualIds = {
  clipId: string;
  softBlurId: string;
};

export function distributionViolinVisualIds(
  baseId: string,
): DistributionViolinVisualIds {
  return {
    clipId: `distribution-violin-clip-${baseId}`,
    softBlurId: `distribution-violin-soft-blur-${baseId}`,
  };
}

type DistributionViolinDefsProps = {
  ids: DistributionViolinVisualIds;
};

/** SVG blur used by temperature/duration distribution violins. */
export function DistributionViolinDefs({ ids }: DistributionViolinDefsProps) {
  return (
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
  );
}
