/**
 * Thermal-style colormap: cold (blue) → cyan → green → yellow → orange → red.
 * `share` is max-normalized blend in [0, 1] (same scale as blur heat).
 *
 * Uses piecewise RGB stops (not linear HSL hue) so mid-range values read as
 * yellow/amber, not all green; cold stops are bright enough to survive
 * `mix-blend-mode: screen` on a dark blue silhouette fill.
 */

const TORSO_RADIAL_EDGE = [0, 0.38, 0.62, 0.85, 1] as const;
const TORSO_RADIAL_OFFSETS = ["0%", "38%", "62%", "85%", "100%"] as const;

type RGB = readonly [number, number, number];

/** Stops chosen for contrast on dark blue + screen blend (not sRGB “true” jet). */
const THERMAL_RGB_STOPS: { pos: number; rgb: RGB }[] = [
  { pos: 0, rgb: [56, 189, 248] },
  { pos: 0.16, rgb: [34, 211, 238] },
  { pos: 0.34, rgb: [45, 212, 191] },
  { pos: 0.5, rgb: [250, 204, 21] },
  { pos: 0.67, rgb: [251, 191, 36] },
  { pos: 0.82, rgb: [251, 146, 60] },
  { pos: 1, rgb: [248, 113, 113] },
];

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function lerpChannel(a: number, b: number, u: number): number {
  return Math.round(a + (b - a) * u);
}

function thermalRgbAt(t: number): RGB {
  const x = clamp01(t);
  const stops = THERMAL_RGB_STOPS;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (x <= b.pos) {
      const span = b.pos - a.pos;
      const u = span <= 0 ? 0 : (x - a.pos) / span;
      return [
        lerpChannel(a.rgb[0], b.rgb[0], u),
        lerpChannel(a.rgb[1], b.rgb[1], u),
        lerpChannel(a.rgb[2], b.rgb[2], u),
      ] as const;
    }
  }
  return stops[stops.length - 1].rgb;
}

export function thermalFillForShare(share: number): {
  fill: string;
  fillOpacity: number;
} {
  const t = clamp01(share);
  const [r, g, b] = thermalRgbAt(t);
  const fillOpacity = Math.min(1, 0.16 + t * 0.7);
  return {
    fill: `rgb(${r}, ${g}, ${b})`,
    fillOpacity,
  };
}

/** Radial stops for torso: center follows region heat; edge cools toward blue. */
export function thermalTorsoRadialStops(share: number): Array<{
  offset: string;
  stopColor: string;
  stopOpacity: number;
}> {
  const s = clamp01(share);
  return TORSO_RADIAL_OFFSETS.map((offset, i) => {
    const edge = TORSO_RADIAL_EDGE[i];
    const effective = clamp01(s * (1 - edge * 0.82));
    const { fill, fillOpacity } = thermalFillForShare(effective);
    const edgeBoost = (1 - edge) * 0.14;
    return {
      offset,
      stopColor: fill,
      stopOpacity: Math.min(0.92, fillOpacity + edgeBoost),
    };
  });
}
