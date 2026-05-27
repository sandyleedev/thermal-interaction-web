/** Soft edge on each subregion mask in detail area view. */
export const DETAIL_AREA_MASK_FEATHER_BLUR = 10;

/** Blur on KDE density fills inside each subregion. */
export const DETAIL_AREA_DENSITY_BLUR = 11;

const FILTER_REGION = {
  x: "-100%",
  y: "-100%",
  width: "300%",
  height: "300%",
} as const;

type BodyMapAreaViewFilterDefsProps = {
  rawDotsSoftBlurId: string;
  areaMaskFeatherFilterId: string;
};

export function BodyMapAreaViewFilterDefs({
  rawDotsSoftBlurId,
  areaMaskFeatherFilterId,
}: BodyMapAreaViewFilterDefsProps) {
  return (
    <>
      <filter
        id={rawDotsSoftBlurId}
        {...FILTER_REGION}
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur
          in="SourceGraphic"
          stdDeviation={DETAIL_AREA_DENSITY_BLUR}
        />
      </filter>
      <filter
        id={areaMaskFeatherFilterId}
        {...FILTER_REGION}
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur
          in="SourceGraphic"
          stdDeviation={DETAIL_AREA_MASK_FEATHER_BLUR}
        />
      </filter>
    </>
  );
}
