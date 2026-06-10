import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  areaDotsLruPut,
  areaDotsLruTouch,
} from "@/components/body-map/shared/bodyMapAreaDotsCache";
import { TorsoDetailPanelMap } from "@/components/body-map/torso/TorsoDetailPanelMap";
import { BodyMapAreaViewLoadingScope } from "@/components/body-map/shared/BodyMapAreaViewLoadingScope";
import { BodyMapHoverTooltip } from "@/components/body-map/shared/BodyMapHoverTooltip";
import type { BodyMapTooltipState } from "@/components/body-map/shared/BodyMapHoverTooltip";
import { MAX_HEATMAP_DOTS_PER_REGION } from "@/components/body-map/bodyMapSampleDots";
import {
  buildTorsoAreaDensityDotsByHitId,
  buildTorsoDotsByHitId,
  type TorsoShapeSpec,
} from "@/components/body-map/torso/torsoDetailSampleDots";
import type { BodyMapVariant } from "@/components/body-map/bodyMapVariant";
import { BodyMapHeatmapLegend } from "@/components/body-map/shared/BodyMapHeatmapLegend";
import {
  bodyMapDetailLegendCaption,
  useBodyMapHelpContext,
} from "@/components/body-map/shared/bodyMapHelpText";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { publicAssetUrl } from "@/lib/publicAssetUrl";
import {
  BODY_MAP_DETAIL_SELECTION_MODE,
  mergedHoverPairHitIds,
} from "@/lib/research/bodyMapDetailSelectionMode";
import { normalizeBodyMapSubpart } from "@/lib/research/bodyMapChipSelection";
import {
  explicitSideBilateralTooltip,
  simpleBodyMapTooltip,
} from "@/lib/research/bodyMapBilateralTooltips";
import type { ResearchPaper } from "@/type/researchPaper";
import { paperMatchesTorsoFineSelection } from "@/lib/research/researchPapers";

/** Smaller than full-body dots so subregions on the torso SVG read more clearly. */
const HEATMAP_DOT_RADIUS = 50;
const BACK_HEATMAP_DOT_RADIUS = 28;
const HEATMAP_DOT_OPACITY_MIN = 0.22;
const HEATMAP_DOT_OPACITY_MAX = 0.52;
const MAX_HEATMAP_DOTS_PER_HIT = MAX_HEATMAP_DOTS_PER_REGION;

/** Finer grid + more thresholds smooth density contour edges in Area view. */
const TORSO_RAW_DOTS_DENSITY_BANDWIDTH = 70;
const TORSO_RAW_DOTS_DENSITY_CELL_SIZE = 2;
const TORSO_RAW_DOTS_DENSITY_THRESHOLDS = 30;

/** Static `Base` silhouette stroke (`silhouetteD` path). */
const TORSO_SILHOUETTE_STROKE_WIDTH = 4;

/** General hover/select ring on `Torso` path (`generalOutlineD`). */
const TORSO_GENERAL_RING_STROKE_WIDTH = 25;

/** Fill hit ids in paint order (later = on top for pointer priority). */
const TORSO_FILL_HIT_IDS = [
  "chest",
  "abdomen",
  "left-shoulder",
  "right-shoulder",
] as const;

const TORSO_BACK_HIT_IDS = ["back"] as const;

const TORSO_COUNT_HIT_IDS = [
  "general",
  ...TORSO_FILL_HIT_IDS,
  ...TORSO_BACK_HIT_IDS,
] as const;

const TORSO_HIT_LABELS: Record<string, string> = {
  general: "General",
  chest: "Chest",
  abdomen: "Abdomen",
  "left-shoulder": "Shoulder (left)",
  "right-shoulder": "Shoulder (right)",
  shoulder: "Shoulder",
  back: "Back",
};

type TooltipState = BodyMapTooltipState;

function readTorsoPath(
  doc: Document,
  id: string,
): { d: string; transform?: string } {
  const pathEl = doc.querySelector(`path[id="${id}"]`);
  const d = pathEl?.getAttribute("d")?.trim();
  if (!d) {
    throw new Error(`Torso map SVG: expected path[id="${id}"].`);
  }
  return { d, transform: pathEl?.getAttribute("transform") ?? undefined };
}

/** Single asset: `torso.svg` (Base, Torso outline, subparts). */
function parseTorsoDetailSvg(svgText: string): {
  silhouetteD: string;
  generalOutlineD: string;
  shapeByHit: Map<string, TorsoShapeSpec>;
} {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const silhouetteD = readTorsoPath(doc, "Base").d;
  const generalOutlineD = readTorsoPath(doc, "Torso").d;

  const shapeByHit = new Map<string, TorsoShapeSpec>();
  shapeByHit.set("chest", { kind: "path", ...readTorsoPath(doc, "Chest") });
  shapeByHit.set("abdomen", { kind: "path", ...readTorsoPath(doc, "Abdomen") });
  shapeByHit.set("left-shoulder", {
    kind: "path",
    ...readTorsoPath(doc, "LeftShoulder"),
  });
  shapeByHit.set("right-shoulder", {
    kind: "path",
    ...readTorsoPath(doc, "RightShoulder"),
  });
  // Back hit: trunk only (`Torso`), not full `Base` (arms/neck). Optional `Back` path if added to SVG.
  const backPathEl = doc.querySelector('path[id="Back"]');
  const backD = backPathEl?.getAttribute("d")?.trim();
  shapeByHit.set("back", {
    kind: "path",
    ...(backD ? readTorsoPath(doc, "Back") : { d: generalOutlineD }),
  });

  return {
    silhouetteD,
    generalOutlineD,
    shapeByHit,
  };
}

export type TorsoBodyMapDetailProps = {
  variant: BodyMapVariant;
  papers: readonly ResearchPaper[];
};

export function TorsoBodyMapDetail({
  variant,
  papers,
}: TorsoBodyMapDetailProps) {
  const { prefersHover } = useBodyMapHelpContext();
  const { toggleBodyMapChip, isBodyMapChipSelected, selectedBodyMapChips } =
    useResearchFilter();

  const uid = useId().replace(/:/g, "");
  const frontIdPrefix = `torso-detail-front-${uid}`;
  const backIdPrefix = `torso-detail-back-${uid}`;

  const [torsoSvgText, setTorsoSvgText] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredHitId, setHoveredHitId] = useState<string | null>(null);
  const [dotsByHitId, setDotsByHitId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});

  const torsoAreaDotsSampleCacheRef = useRef<
    Map<string, Record<string, { x: number; y: number }[]>>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch(publicAssetUrl("body-map/torso.svg"))
      .then((r) => {
        if (!r.ok) throw new Error(`torso map HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setTorsoSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setTorsoSvgText("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const torsoParse = useMemo(() => {
    if (!torsoSvgText) {
      return {
        silhouetteD: "",
        generalOutlineD: "",
        shapeByHit: new Map<string, TorsoShapeSpec>(),
        error: null as string | null,
      };
    }
    try {
      const parsed = parseTorsoDetailSvg(torsoSvgText);
      return {
        ...parsed,
        error: null as string | null,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        silhouetteD: "",
        generalOutlineD: "",
        shapeByHit: new Map<string, TorsoShapeSpec>(),
        error: msg,
      };
    }
  }, [torsoSvgText]);

  const {
    silhouetteD,
    generalOutlineD,
    shapeByHit,
    error: torsoParseError,
  } = torsoParse;

  const paperIdsKey = useMemo(
    () => papers.map((p) => p.id).join("\0"),
    [papers],
  );

  const shapeByHitKey = useMemo(
    () => [...shapeByHit.keys()].sort().join("\0"),
    [shapeByHit],
  );

  const countsByHit = useMemo(() => {
    const m: Record<string, number> = {};
    for (const k of TORSO_COUNT_HIT_IDS) {
      m[k] = papers.filter((p) => paperMatchesTorsoFineSelection(p, k)).length;
    }
    return m;
  }, [papers, paperIdsKey]);

  const countColorDomain = useMemo<[number, number]>(() => {
    const vals = [...TORSO_FILL_HIT_IDS.map((id) => countsByHit[id] ?? 0)];
    const maxVal = Math.max(0, ...vals);
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [countsByHit]);

  const backCountColorDomain = useMemo<[number, number]>(() => {
    const backCount = countsByHit.back ?? 0;
    return backCount <= 0 ? [0, 1] : [0, backCount];
  }, [countsByHit]);

  useLayoutEffect(() => {
    if (!shapeByHit.size) return;
    let cancelled = false;
    const areaCacheKey = `${paperIdsKey}\0${shapeByHitKey}`;

    if (variant === "rawDots") {
      const cached = areaDotsLruTouch(
        torsoAreaDotsSampleCacheRef.current,
        areaCacheKey,
      );
      if (cached) {
        queueMicrotask(() => {
          if (!cancelled) setDotsByHitId(structuredClone(cached));
        });
        return () => {
          cancelled = true;
        };
      }
    }

    const next =
      variant === "rawDots"
        ? buildTorsoAreaDensityDotsByHitId(
            papers,
            shapeByHit,
            MAX_HEATMAP_DOTS_PER_HIT,
          )
        : buildTorsoDotsByHitId(papers, shapeByHit, MAX_HEATMAP_DOTS_PER_HIT);

    if (variant === "rawDots") {
      areaDotsLruPut(
        torsoAreaDotsSampleCacheRef.current,
        areaCacheKey,
        structuredClone(next),
      );
    }

    queueMicrotask(() => {
      if (!cancelled) setDotsByHitId(next);
    });
    return () => {
      cancelled = true;
    };
  }, [shapeByHit, paperIdsKey, papers, variant, shapeByHitKey]);

  const clearHover = useCallback(() => {
    setHoveredHitId(null);
    setTooltip(null);
  }, []);

  const handleFillHitEnter = useCallback(
    (hitId: string) => {
      return (e: PointerEvent<SVGElement>) => {
        setHoveredHitId(hitId);
        if (hitId === "left-shoulder" || hitId === "right-shoulder") {
          setTooltip(
            explicitSideBilateralTooltip(
              papers,
              "shoulder",
              "torso",
              "shoulder",
              hitId.startsWith("left") ? "left" : "right",
              (p) => paperMatchesTorsoFineSelection(p, "shoulder"),
              e.clientX,
              e.clientY,
            ),
          );
          return;
        }
        setTooltip(
          simpleBodyMapTooltip(
            TORSO_HIT_LABELS[hitId] ?? hitId,
            countsByHit[hitId] ?? 0,
            e.clientX,
            e.clientY,
          ),
        );
      };
    },
    [countsByHit, papers],
  );

  const handleMove = useCallback((e: PointerEvent<SVGElement>) => {
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
    );
  }, []);

  const toggleHit = useCallback(
    (hitId: string) => {
      toggleBodyMapChip("torso", hitId);
    },
    [toggleBodyMapChip],
  );

  const isHitSelected = useCallback(
    (hitId: string) => isBodyMapChipSelected("torso", hitId),
    [isBodyMapChipSelected],
  );

  const hoveredHitIds = useMemo(
    () =>
      hoveredHitId
        ? BODY_MAP_DETAIL_SELECTION_MODE === "merged"
          ? mergedHoverPairHitIds("torso", hoveredHitId)
          : [hoveredHitId]
        : [],
    [hoveredHitId],
  );

  const generalRingHovered = hoveredHitId === "general";
  const generalRingActive =
    generalRingHovered || isBodyMapChipSelected("torso", "general");

  /** Avoid stacking a thick General ring on top of a selected fine fill. */
  const suppressSelectedFineFillWhileGeneralHover =
    generalRingHovered &&
    selectedBodyMapChips.some(
      (c) =>
        c.parent === "torso" &&
        normalizeBodyMapSubpart(c.subpart) !== "" &&
        normalizeBodyMapSubpart(c.subpart) !== "general",
    );

  const handleGeneralRingEnter = useCallback(
    (e: PointerEvent<SVGElement>) => {
      setHoveredHitId("general");
      setTooltip(
        simpleBodyMapTooltip(
          TORSO_HIT_LABELS.general,
          countsByHit.general ?? 0,
          e.clientX,
          e.clientY,
        ),
      );
    },
    [countsByHit],
  );

  const panelMapCommon = {
    variant,
    silhouetteD,
    generalOutlineD,
    shapeByHit,
    dotsByHitId,
    countsByHit,
    heatmapDotOpacityMin: HEATMAP_DOT_OPACITY_MIN,
    heatmapDotOpacityMax: HEATMAP_DOT_OPACITY_MAX,
    silhouetteStrokeWidth: TORSO_SILHOUETTE_STROKE_WIDTH,
    generalRingStrokeWidth: TORSO_GENERAL_RING_STROKE_WIDTH,
    rawDotsDensityBandwidth: TORSO_RAW_DOTS_DENSITY_BANDWIDTH,
    rawDotsDensityCellSize: TORSO_RAW_DOTS_DENSITY_CELL_SIZE,
    rawDotsDensityThresholds: TORSO_RAW_DOTS_DENSITY_THRESHOLDS,
    hoveredHitId,
    isHitSelected,
    suppressSelectedFineFillWhileGeneralHover,
    onFillHitEnter: handleFillHitEnter,
    onPointerMove: handleMove,
    onPointerLeave: clearHover,
    onToggleHit: toggleHit,
    onGeneralRingEnter: handleGeneralRingEnter,
    onGeneralRingClick: () => toggleBodyMapChip("torso", "general"),
    generalRingActive,
    generalRingHovered,
    hoveredHitIds,
  };

  return (
    <div className="body-map-root torso-detail-root">
      <div className="body-map-svg-wrap torso-detail-svg-wrap">
        {torsoParseError ? (
          <p className="torso-detail-error" role="alert">
            {torsoParseError}
          </p>
        ) : null}
        {torsoSvgText === null ? (
          <p className="torso-detail-loading">Loading torso map…</p>
        ) : null}
        {torsoSvgText === "" ? (
          <p className="torso-detail-error" role="alert">
            Could not load torso map SVG.
          </p>
        ) : null}
        {torsoSvgText && silhouetteD && generalOutlineD && !torsoParseError ? (
          <BodyMapAreaViewLoadingScope className="torso-detail-stage">
            <div className="torso-detail-back-panel">
              <TorsoDetailPanelMap
                panel="back"
                svgClassName="body-map-svg torso-detail-svg torso-detail-svg--back"
                ariaLabel="Torso back: papers with back subregion"
                idPrefix={backIdPrefix}
                fillHitIds={TORSO_BACK_HIT_IDS}
                showGeneralRing={false}
                countColorDomain={backCountColorDomain}
                heatmapDotRadius={BACK_HEATMAP_DOT_RADIUS}
                {...panelMapCommon}
              />
              <p className="torso-detail-view-label">Back</p>
            </div>
            <div className="torso-detail-front-panel">
              <TorsoDetailPanelMap
                panel="front"
                svgClassName="body-map-svg torso-detail-svg torso-detail-svg--front"
                ariaLabel="Torso front: chest, abdomen, left/right shoulder, and general outline"
                idPrefix={frontIdPrefix}
                fillHitIds={TORSO_FILL_HIT_IDS}
                showGeneralRing
                countColorDomain={countColorDomain}
                heatmapDotRadius={HEATMAP_DOT_RADIUS}
                {...panelMapCommon}
              />
              <p className="torso-detail-view-label">Front</p>
            </div>
          </BodyMapAreaViewLoadingScope>
        ) : null}
      </div>

      {torsoSvgText && silhouetteD && generalOutlineD && !torsoParseError ? (
        <BodyMapHeatmapLegend
          variant={variant}
          colorDomain={countColorDomain}
          gradientId={`${uid}-torso-legend-${variant}`}
          className="torso-detail-legend"
          caption={bodyMapDetailLegendCaption({
            variant,
            colorDomain: countColorDomain,
            prefersHover,
            generalScope: "whole-torso (general)",
          })}
        />
      ) : null}

      <BodyMapHoverTooltip tooltip={tooltip} />
    </div>
  );
}
