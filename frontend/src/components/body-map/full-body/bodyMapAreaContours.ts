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

export type DetailAreaDensityContourEntry = {
  hitId: string;
  contours: ContourMultiPolygon[];
};

export function buildDetailAreaDensityContoursByHit(
  fillHitIds: readonly string[],
  dotsByHitId: Record<string, { x: number; y: number }[]>,
  viewBox: string,
  options: {
    cellSize: number;
    bandwidth: number;
    thresholds: number;
  },
): DetailAreaDensityContourEntry[] {
  const vbParts = viewBox.split(/\s+/).map(Number);
  const vbW = vbParts[2] ?? 210;
  const vbH = vbParts[3] ?? 297;
  const vbY = vbParts[1] ?? 0;
  const density = contourDensity<{ x: number; y: number }>()
    .x((d) => d.x)
    .y((d) => d.y)
    .size([vbW, vbY + vbH])
    .cellSize(options.cellSize)
    .bandwidth(options.bandwidth)
    .thresholds(options.thresholds);
  return fillHitIds.flatMap((hitId) => {
    const points = dotsByHitId[hitId] ?? [];
    if (points.length < 2) return [];
    return [{ hitId, contours: density(points) }];
  });
}
