import {
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
  tempToX,
} from "@/components/temperature-panel/temperaturePanelUtils";

/** 1 / sqrt(2π), used by the Gaussian kernel. */
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

function gaussianKernel(delta: number, bandwidth: number): number {
  const z = delta / bandwidth;
  return (INV_SQRT_2PI / bandwidth) * Math.exp(-0.5 * z * z);
}

/** KDE density value at one temperature sample point (°C). */
function kdeAt(
  tempC: number,
  samples: readonly number[],
  bandwidth: number,
): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sampleTempC of samples) {
    sum += gaussianKernel(tempC - sampleTempC, bandwidth);
  }
  return sum / samples.length;
}

export type KdePathResult = {
  /** SVG path for the KDE line. */
  lineD: string;
  /** Closed SVG path for area fill under the KDE line. */
  areaD: string;
  /** Raw polyline points (useful for debugging or future overlays). */
  points: { x: number; y: number }[];
};

/**
 * Build horizontal KDE SVG paths.
 * x-axis: temperature (cold left → hot right)
 * y-axis: density (higher means more papers around that temperature)
 */
export function buildKdePathsHorizontal(
  samples: readonly number[],
  plotWidth: number,
  plotHeight: number,
  padding: { left: number; right: number; top: number; bottom: number },
  options?: { bandwidth?: number; steps?: number },
): KdePathResult {
  // Gaussian spread in °C: larger = smoother curve, smaller = sharper peaks.
  const bandwidth = options?.bandwidth ?? 5.5;
  // Number of temperature samples along the axis (more = smoother SVG path).
  const steps = options?.steps ?? 72;
  const plotInnerWidth = plotWidth - padding.left - padding.right;
  const plotInnerHeight = plotHeight - padding.top - padding.bottom;
  const densityBaselineY = plotHeight - padding.bottom;

  const densityByTemperature: { x: number; density: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const tempC = TEMP_AXIS_MIN + (i / steps) * (TEMP_AXIS_MAX - TEMP_AXIS_MIN);
    const x = padding.left + tempToX(tempC, plotInnerWidth);
    const density = kdeAt(tempC, samples, bandwidth);
    densityByTemperature.push({ x, density });
  }

  let maxDensity = 1e-12;
  for (const sample of densityByTemperature) {
    maxDensity = Math.max(maxDensity, sample.density);
  }

  const densityHeightScale = Math.max(4, plotInnerHeight - 6) * 0.92;
  const lineParts: string[] = [];
  const linePoints: { x: number; y: number }[] = [];
  for (let i = 0; i < densityByTemperature.length; i++) {
    const point = densityByTemperature[i];
    const y =
      densityBaselineY - (point.density / maxDensity) * densityHeightScale;
    const cmd = i === 0 ? "M" : "L";
    lineParts.push(`${cmd} ${point.x.toFixed(2)} ${y.toFixed(2)}`);
    linePoints.push({ x: point.x, y });
  }

  const firstX = densityByTemperature[0].x;
  const lastX = densityByTemperature[densityByTemperature.length - 1].x;
  const firstCurveY =
    densityBaselineY -
    (densityByTemperature[0].density / maxDensity) * densityHeightScale;
  let areaD = `M ${firstX.toFixed(2)} ${densityBaselineY.toFixed(2)} L ${firstX.toFixed(2)} ${firstCurveY.toFixed(2)}`;
  for (let i = 1; i < densityByTemperature.length; i++) {
    const point = densityByTemperature[i];
    const curveY =
      densityBaselineY - (point.density / maxDensity) * densityHeightScale;
    areaD += ` L ${point.x.toFixed(2)} ${curveY.toFixed(2)}`;
  }
  areaD += ` L ${lastX.toFixed(2)} ${densityBaselineY.toFixed(2)} Z`;

  return {
    lineD: lineParts.join(" "),
    areaD,
    points: linePoints,
  };
}
