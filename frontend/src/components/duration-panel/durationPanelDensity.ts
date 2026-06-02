import {
  buildHorizontalKdePaths,
  type KdePathResult,
  type PlotPadding,
} from "@/components/distribution-violin/buildHorizontalKdePaths";
import { durationToNorm } from "@/components/duration-panel/durationPanelUtils";

export type { KdePathResult, PlotPadding };

/**
 * Build horizontal KDE SVG paths for the duration panel.
 * x-axis: study duration (short left → long right, piecewise log scale in utils)
 * y-axis: density (higher means more papers around that duration)
 */
export function buildDurationKdePathsHorizontal(
  durationSamplesS: readonly number[],
  plotWidth: number,
  plotHeight: number,
  padding: PlotPadding,
  options?: { bandwidth?: number; steps?: number },
): KdePathResult {
  const durationNormSamples = durationSamplesS.map((seconds) =>
    durationToNorm(seconds),
  );
  return buildHorizontalKdePaths(
    durationNormSamples,
    plotWidth,
    plotHeight,
    padding,
    {
      bandwidth: options?.bandwidth ?? 0.075,
      steps: options?.steps,
      axisPointAtStep: (stepIndex, steps, { plotInnerWidth }) => {
        const durationNorm = stepIndex / steps;
        return {
          domainValue: durationNorm,
          x: padding.left + durationNorm * plotInnerWidth,
        };
      },
    },
  );
}
