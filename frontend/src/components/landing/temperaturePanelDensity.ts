import {
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
  tempToY,
} from "@/components/landing/temperaturePanelUtils";

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

function gaussianKernel(delta: number, bandwidth: number): number {
  const z = delta / bandwidth;
  return (INV_SQRT_2PI / bandwidth) * Math.exp(-0.5 * z * z);
}

/** Gaussian KDE at temperature t (°C). */
export function kdeAt(
  tempC: number,
  samples: readonly number[],
  bandwidth: number,
): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const x of samples) {
    sum += gaussianKernel(tempC - x, bandwidth);
  }
  return sum / samples.length;
}

export type KdePathResult = {
  lineD: string;
  areaD: string;
};

/**
 * Smooth KDE polyline + closed area (for fill) in SVG coords.
 * `dotZoneRight` is the x where the KDE strip starts; density extends to `plotWidth`.
 */
export function buildKdePaths(
  samples: readonly number[],
  plotHeight: number,
  plotWidth: number,
  dotZoneRight: number,
  options?: { bandwidth?: number; steps?: number },
): KdePathResult {
  const bandwidth = options?.bandwidth ?? 5.5;
  const steps = options?.steps ?? 72;
  const kdeLeft = dotZoneRight + 2;
  const kdeRight = plotWidth - 2;

  const points: { y: number; density: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const tempC =
      TEMP_AXIS_MAX - (i / steps) * (TEMP_AXIS_MAX - TEMP_AXIS_MIN);
    const y = tempToY(tempC, plotHeight);
    const density = kdeAt(tempC, samples, bandwidth);
    points.push({ y, density });
  }

  let maxD = 1e-12;
  for (const p of points) {
    maxD = Math.max(maxD, p.density);
  }

  const lineParts: string[] = [];
  const xs: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const x =
      kdeLeft + (points[i].density / maxD) * (kdeRight - kdeLeft);
    xs.push(x);
    const cmd = i === 0 ? "M" : "L";
    lineParts.push(`${cmd} ${x.toFixed(2)} ${points[i].y.toFixed(2)}`);
  }

  const y0 = points[0].y;
  const yLast = points[points.length - 1].y;
  let areaD = `M ${kdeRight.toFixed(2)} ${y0.toFixed(2)} L ${xs[0].toFixed(2)} ${y0.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    areaD += ` L ${xs[i].toFixed(2)} ${points[i].y.toFixed(2)}`;
  }
  areaD += ` L ${kdeRight.toFixed(2)} ${yLast.toFixed(2)} Z`;

  return {
    lineD: lineParts.join(" "),
    areaD,
  };
}

/** Stable pseudo-random in [-1, 1] for horizontal jitter. */
export function jitter11(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 43758.5453) * 43758.5453123;
  return (x - Math.floor(x)) * 2 - 1;
}
