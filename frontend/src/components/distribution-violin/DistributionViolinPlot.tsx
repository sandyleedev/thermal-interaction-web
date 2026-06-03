import { useId } from "react";
import {
  clampViolinSelectionLabelX,
  type KdePathResult,
  type PlotPadding,
} from "@/components/distribution-violin/buildHorizontalKdePaths";
import {
  DistributionViolinDefs,
  DISTRIBUTION_PINK_AREA,
  DISTRIBUTION_PINK_SELECTION,
  DISTRIBUTION_PINK_VIVID,
  distributionViolinVisualIds,
} from "@/components/distribution-violin/distributionViolinVisuals";

type DistributionViolinPlotProps = {
  plotWidth: number;
  plotHeight: number;
  padding: PlotPadding;
  kdePaths: KdePathResult;
  rangeLeft: number;
  rangeWidth: number;
  selectionRatioPct: number;
  ariaLabel: string;
  plotClassName: string;
  svgClassName: string;
  /** Vertical position of the % label as a fraction of inner plot height (from top). */
  selectionLabelYFactor?: number;
};

/** Single-sided horizontal violin: KDE fill, selection band, and match %. */
export function DistributionViolinPlot({
  plotWidth,
  plotHeight,
  padding,
  kdePaths,
  rangeLeft,
  rangeWidth,
  selectionRatioPct,
  ariaLabel,
  plotClassName,
  svgClassName,
  selectionLabelYFactor = 0.68,
}: DistributionViolinPlotProps) {
  const violinClipId = useId().replace(/:/g, "");
  const plotInnerWidth = plotWidth - padding.left - padding.right;
  const plotInnerHeight = plotHeight - padding.top - padding.bottom;
  const violinSelectionX = padding.left + plotInnerWidth * rangeLeft;
  const violinSelectionW = plotInnerWidth * rangeWidth;
  const violinLabelX = clampViolinSelectionLabelX(
    violinSelectionX + violinSelectionW / 2,
    plotWidth,
    padding.left,
    padding.right,
  );
  const violinVisualIds = distributionViolinVisualIds(violinClipId);
  const selectionLabelLeftPct = (violinLabelX / plotWidth) * 100;
  const selectionLabelTopPct =
    ((padding.top + plotInnerHeight * selectionLabelYFactor) / plotHeight) *
    100;

  return (
    <div className={`${plotClassName} distribution-violin-plot`}>
      <svg
        className={svgClassName}
        viewBox={`0 0 ${plotWidth} ${plotHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <clipPath id={violinVisualIds.clipId}>
            <path d={kdePaths.areaD} />
          </clipPath>
          <DistributionViolinDefs ids={violinVisualIds} />
        </defs>
        <g filter={`url(#${violinVisualIds.softBlurId})`}>
          <path d={kdePaths.areaD} fill={DISTRIBUTION_PINK_AREA} />
          <rect
            x={violinSelectionX}
            y={padding.top}
            width={Math.max(0, violinSelectionW)}
            height={plotInnerHeight}
            fill={DISTRIBUTION_PINK_SELECTION}
            clipPath={`url(#${violinVisualIds.clipId})`}
          />
        </g>
        <path
          d={kdePaths.lineD}
          className="distribution-violin-line"
          fill="none"
          stroke={DISTRIBUTION_PINK_VIVID}
        />
      </svg>
      <span
        className="distribution-violin-selection-label"
        style={{
          left: `${selectionLabelLeftPct}%`,
          top: `${selectionLabelTopPct}%`,
        }}
        aria-hidden
      >
        {Math.round(selectionRatioPct)}%
      </span>
    </div>
  );
}
