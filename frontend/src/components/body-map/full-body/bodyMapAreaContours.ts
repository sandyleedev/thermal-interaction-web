import { contourDensity, geoPath } from "d3";
import type { ContourMultiPolygon } from "d3-contour";
import { BODY_MAP_VIEW } from "../bodyMapOutlinePath";
import type { BodyMapRegion } from "@/lib/research/researchPapers";
import type { BodySubpath } from "../bodyMapSampleDots";

export type BodyMapAreaContourPart = {
  id: BodyMapRegion;
  subpaths: readonly BodySubpath[];
};

export function buildBodyMapAreaDensityContoursByPart(
  bodyParts: readonly BodyMapAreaContourPart[],
  dotsByPartId: Record<string, { x: number; y: number }[]>,
): { partId: BodyMapRegion; contours: ContourMultiPolygon[] }[] {
  const density = contourDensity<{ x: number; y: number }>()
    .x((d) => d.x)
    .y((d) => d.y)
    .size([BODY_MAP_VIEW.w, BODY_MAP_VIEW.y + BODY_MAP_VIEW.h])
    .bandwidth(36)
    .thresholds(28);
  return bodyParts
    .map((part) => {
      const points = dotsByPartId[part.id] ?? [];
      if (points.length < 2) return null;
      const contours = density(points);
      return { partId: part.id, contours };
    })
    .filter(
      (
        entry,
      ): entry is {
        partId: BodyMapRegion;
        contours: ContourMultiPolygon[];
      } => entry !== null,
    );
}

export function maxContourValueFromLayers(
  layers: readonly { contours: readonly ContourMultiPolygon[] }[],
): number {
  return Math.max(
    0,
    ...layers.flatMap((entry) =>
      entry.contours.map((contour) => contour.value ?? 0),
    ),
  );
}

export function createBodyMapAreaContourGeoPath() {
  return geoPath();
}
