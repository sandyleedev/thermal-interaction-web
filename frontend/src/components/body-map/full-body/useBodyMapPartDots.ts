import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { BodyMapVariant } from "@/components/body-map/bodyMapVariant";
import {
  collectHeatmapDotPlacementTargetsForCoarsePart,
  MAX_HEATMAP_DOTS_PER_REGION,
  sampleHeatmapAreaDensityDots,
  sampleHeatmapDotPlacements,
  type BodySubpath,
} from "@/components/body-map/bodyMapSampleDots";
import {
  areaDotsLruPut,
  areaDotsLruTouch,
} from "@/components/body-map/shared/bodyMapAreaDotsCache";
import type { BodyMapRegion, ResearchPaper } from "@/lib/research/researchPapers";

export type FullBodyMapPart = {
  id: BodyMapRegion;
  label: string;
  subpaths: BodySubpath[];
};

type UseBodyMapPartDotsArgs = {
  variant: BodyMapVariant;
  bodyParts: readonly FullBodyMapPart[];
  heatmapDotPapers: readonly ResearchPaper[] | undefined;
  paperCountsKey: string;
  heatmapPaperIdsKey: string;
};

/**
 * Dot view: sparse placement samples per part. Area view: dense KDE input points (cached by paper ids + geometry).
 */
export function useBodyMapPartDots({
  variant,
  bodyParts,
  heatmapDotPapers,
  paperCountsKey,
  heatmapPaperIdsKey,
}: UseBodyMapPartDotsArgs): {
  dotsByPartId: Record<string, { x: number; y: number }[]>;
  isAreaDotsComputing: boolean;
} {
  const [dotsByPartId, setDotsByPartId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});
  const [isAreaDotsComputing, setIsAreaDotsComputing] = useState(false);

  const bodyStructureKey = useMemo(
    () => bodyParts.map((p) => `${p.id}:${p.subpaths.length}`).join("|"),
    [bodyParts],
  );

  const areaDotsSampleCacheRef = useRef<
    Map<string, Record<string, { x: number; y: number }[]>>
  >(new Map());

  useLayoutEffect(() => {
    let cancelled = false;
    const areaCacheKey = `${heatmapPaperIdsKey}\0${bodyStructureKey}`;

    if (variant === "rawDots") {
      setIsAreaDotsComputing(true);
      const cached = areaDotsLruTouch(
        areaDotsSampleCacheRef.current,
        areaCacheKey,
      );
      if (cached) {
        queueMicrotask(() => {
          if (!cancelled) {
            setDotsByPartId(structuredClone(cached));
            setIsAreaDotsComputing(false);
          }
        });
        return () => {
          cancelled = true;
          setIsAreaDotsComputing(false);
        };
      }
    } else {
      setIsAreaDotsComputing(false);
    }

    const next: Record<string, { x: number; y: number }[]> = {};
    for (const part of bodyParts) {
      if (variant === "rawDots") {
        const papersForDots = heatmapDotPapers ?? [];
        const targets = collectHeatmapDotPlacementTargetsForCoarsePart(
          part.id,
          papersForDots,
          part.subpaths,
        );
        if (targets.length <= 0) {
          next[part.id] = [];
        } else {
          next[part.id] = sampleHeatmapAreaDensityDots(
            part.subpaths,
            targets,
            part.id,
            MAX_HEATMAP_DOTS_PER_REGION,
          );
        }
      } else {
        const papersForDots = heatmapDotPapers ?? [];
        const targets = collectHeatmapDotPlacementTargetsForCoarsePart(
          part.id,
          papersForDots,
          part.subpaths,
        );
        next[part.id] = sampleHeatmapDotPlacements(
          part.subpaths,
          targets,
          part.id,
        );
      }
    }

    if (variant === "rawDots") {
      areaDotsLruPut(
        areaDotsSampleCacheRef.current,
        areaCacheKey,
        structuredClone(next),
      );
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setDotsByPartId(next);
        setIsAreaDotsComputing(false);
      }
    });
    return () => {
      cancelled = true;
      setIsAreaDotsComputing(false);
    };
  }, [
    paperCountsKey,
    variant,
    heatmapPaperIdsKey,
    heatmapDotPapers,
    bodyParts,
    bodyStructureKey,
  ]);

  return { dotsByPartId, isAreaDotsComputing };
}
