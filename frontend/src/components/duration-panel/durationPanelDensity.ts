import { durationToNorm } from "./durationPanelUtils";

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

function gaussianKernel(delta: number, bandwidth: number): number {
  const z = delta / bandwidth;
  return (INV_SQRT_2PI / bandwidth) * Math.exp(-0.5 * z * z);
}

function kdeAt(value: number, samples: readonly number[], bandwidth: number): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) {
    sum += gaussianKernel(value - sample, bandwidth);
  }
  return sum / samples.length;
}

export type KdePathResult = {
  lineD: string;
  areaD: string;
  points: { x: number; y: number }[];
};

/**
 * Horizontal KDE in log-duration space:
 * x = duration (1s -> 1wk), y = density upward from baseline.
 */
export function buildDurationKdePathsHorizontal(
  durationSamplesS: readonly number[],
  plotWidth: number,
  plotHeight: number,
  padding: { left: number; right: number; top: number; bottom: number },
  options?: { bandwidth?: number; steps?: number },
): KdePathResult {
  const steps = options?.steps ?? 72;
  const normalizedSamples = durationSamplesS.map((s) => durationToNorm(s));
  const bandwidth = options?.bandwidth ?? 0.075;
  const innerW = plotWidth - padding.left - padding.right;
  const innerH = plotHeight - padding.top - padding.bottom;
  const baselineY = plotHeight - padding.bottom;

  const points: { x: number; density: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const norm = i / steps;
    const x = padding.left + norm * innerW;
    const density = kdeAt(norm, normalizedSamples, bandwidth);
    points.push({ x, density });
  }

  let maxD = 1e-12;
  for (const point of points) {
    maxD = Math.max(maxD, point.density);
  }

  const yScale = Math.max(4, innerH - 6) * 0.92;
  const lineParts: string[] = [];
  const linePoints: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const y = baselineY - (points[i].density / maxD) * yScale;
    const cmd = i === 0 ? "M" : "L";
    lineParts.push(`${cmd} ${points[i].x.toFixed(2)} ${y.toFixed(2)}`);
    linePoints.push({ x: points[i].x, y });
  }

  const x0 = points[0].x;
  const xLast = points[points.length - 1].x;
  const y0 = baselineY - (points[0].density / maxD) * yScale;
  const yBaseline = baselineY;
  let areaD = `M ${x0.toFixed(2)} ${yBaseline.toFixed(2)} L ${x0.toFixed(2)} ${y0.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const yi = baselineY - (points[i].density / maxD) * yScale;
    areaD += ` L ${points[i].x.toFixed(2)} ${yi.toFixed(2)}`;
  }
  areaD += ` L ${xLast.toFixed(2)} ${yBaseline.toFixed(2)} Z`;

  return {
    lineD: lineParts.join(" "),
    areaD,
    points: linePoints,
  };
}
