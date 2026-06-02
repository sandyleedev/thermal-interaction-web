import {
  buildHorizontalKdePaths,
  type KdePathResult,
  type PlotPadding,
} from "@/components/distribution-violin/buildHorizontalKdePaths";
import {
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
  tempToX,
} from "@/components/temperature-panel/temperaturePanelUtils";

export type { KdePathResult, PlotPadding };

/**
 * Build horizontal KDE SVG paths.
 * x-axis: temperature (cold left → hot right)
 * y-axis: density (higher means more papers around that temperature)
 */
export function buildKdePathsHorizontal(
  samples: readonly number[],
  plotWidth: number,
  plotHeight: number,
  padding: PlotPadding,
  options?: { bandwidth?: number; steps?: number },
): KdePathResult {
  return buildHorizontalKdePaths(samples, plotWidth, plotHeight, padding, {
    bandwidth: options?.bandwidth ?? 5.5,
    steps: options?.steps,
    axisPointAtStep: (stepIndex, steps, { plotInnerWidth }) => {
      const tempC =
        TEMP_AXIS_MIN + (stepIndex / steps) * (TEMP_AXIS_MAX - TEMP_AXIS_MIN);
      return {
        domainValue: tempC,
        x: padding.left + tempToX(tempC, plotInnerWidth),
      };
    },
  });
}
