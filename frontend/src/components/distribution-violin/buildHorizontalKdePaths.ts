/** 1 / sqrt(2π), used by the Gaussian kernel. */
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

/** Gaussian kernel for KDE density calculation. */
function gaussianKernel(delta: number, bandwidth: number): number {
  const z = delta / bandwidth;
  return (INV_SQRT_2PI / bandwidth) * Math.exp(-0.5 * z * z);
}

/** KDE density value at one sample point (domainValue). */
function kdeAt(
  domainValue: number,
  samples: readonly number[],
  bandwidth: number,
): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) {
    sum += gaussianKernel(domainValue - sample, bandwidth);
  }
  return sum / samples.length;
}

/** Padding around the plot area (left, right, top, bottom). */
export type PlotPadding = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** Result of KDE path generation: line path, area path, and raw points. */
export type KdePathResult = {
  /** SVG path for the KDE line. */
  lineD: string;
  /** Closed SVG path for area fill under the KDE line. */
  areaD: string;
  /** Raw polyline points (useful for debugging or future overlays). */
  points: { x: number; y: number }[];
};

/** Inner plot width and height (after padding). */
type PlotInnerLayout = {
  plotInnerWidth: number;
  plotInnerHeight: number;
};

/**
 * Build horizontal KDE SVG paths. Callers supply how each step maps to KDE domain
 * value and pixel x (linear temperature, log-scaled duration norm, etc.).
 */
export function buildHorizontalKdePaths(
  samples: readonly number[],
  plotWidth: number,
  plotHeight: number,
  padding: PlotPadding,
  config: {
    bandwidth: number;
    steps?: number;
    axisPointAtStep: (
      stepIndex: number,
      steps: number,
      layout: PlotInnerLayout,
    ) => { domainValue: number; x: number };
  },
): KdePathResult {
  const steps = config.steps ?? 72;
  const plotInnerWidth = plotWidth - padding.left - padding.right;
  const plotInnerHeight = plotHeight - padding.top - padding.bottom;
  const densityBaselineY = plotHeight - padding.bottom;
  const layout: PlotInnerLayout = { plotInnerWidth, plotInnerHeight };

  const densityAlongAxis: { x: number; density: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const { domainValue, x } = config.axisPointAtStep(i, steps, layout);
    const density = kdeAt(domainValue, samples, config.bandwidth);
    densityAlongAxis.push({ x, density });
  }

  let maxDensity = 1e-12;
  for (const sample of densityAlongAxis) {
    maxDensity = Math.max(maxDensity, sample.density);
  }

  const densityHeightScale = Math.max(4, plotInnerHeight - 6) * 0.92;
  const lineParts: string[] = [];
  const linePoints: { x: number; y: number }[] = [];
  for (let i = 0; i < densityAlongAxis.length; i++) {
    const point = densityAlongAxis[i];
    const y =
      densityBaselineY - (point.density / maxDensity) * densityHeightScale;
    const cmd = i === 0 ? "M" : "L";
    lineParts.push(`${cmd} ${point.x.toFixed(2)} ${y.toFixed(2)}`);
    linePoints.push({ x: point.x, y });
  }

  const firstX = densityAlongAxis[0].x;
  const lastX = densityAlongAxis[densityAlongAxis.length - 1].x;
  const firstCurveY =
    densityBaselineY -
    (densityAlongAxis[0].density / maxDensity) * densityHeightScale;
  let areaD = `M ${firstX.toFixed(2)} ${densityBaselineY.toFixed(2)} L ${firstX.toFixed(2)} ${firstCurveY.toFixed(2)}`;
  for (let i = 1; i < densityAlongAxis.length; i++) {
    const point = densityAlongAxis[i];
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

/** Clamp the selection % label so it stays inside the plot margins. */
export function clampViolinSelectionLabelX(
  labelXRaw: number,
  plotWidth: number,
  padLeft: number,
  padRight: number,
  margin = 14,
): number {
  return Math.max(
    padLeft + margin,
    Math.min(plotWidth - padRight - margin, labelXRaw),
  );
}
