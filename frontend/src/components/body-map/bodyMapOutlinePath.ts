/**
 * User-space viewBox + outer silhouette `d` for the body map and for temp SVG in `bodyMapSampleDots`.
 * Outline `d` comes from {@link getBodySilhouetteAsset} after {@link loadBodySilhouetteAsset}.
 */
import { getBodySilhouetteAsset } from "@/components/body-map/bodyMapSilhouetteAsset";

/**
 * Cropped viewport (legacy framing): trims ~70px at the top of the raw SVG viewBox so the
 * figure matches the previous layout; path data stays in full SVG user space.
 */
export const BODY_MAP_VIEW = {
  x: 0,
  y: 70,
  w: 837.483,
  h: 1749.369,
} as const;

/** Body silhouette `d` — same as clip path; used for dot sampling inside visible fill. */
export function getBodyMapOutlinePathD(): string {
  return getBodySilhouetteAsset().outlinePathD;
}
