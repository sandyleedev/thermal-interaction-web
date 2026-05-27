import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  areaDotsLruPut,
  areaDotsLruTouch,
} from "../shared/bodyMapAreaDotsCache";
import { ArmDetailPanelMap } from "../arm/ArmDetailPanelMap";
import { BodyMapHoverTooltip } from "../shared/BodyMapHoverTooltip";
import type { BodyMapTooltipState } from "../shared/BodyMapHoverTooltip";
import {
  legBilateralTooltip,
  simpleBodyMapTooltip,
} from "@/lib/research/bodyMapBilateralTooltips";
import {
  buildLegAreaDensityDotsByHitId,
  buildLegDotsByHitId,
  resolveLegDetailViewBox,
  type LegShapeSpec,
} from "./legDetailSampleDots";
import type { BodyMapVariant } from "../bodyMapVariant";
import { BodyMapHeatmapLegend } from "../shared/BodyMapHeatmapLegend";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { normalizeBodyMapSubpart } from "@/lib/research/bodyMapChipSelection";
import {
  LEG_DETAIL_HIT_IDS,
  paperMatchesLegFineSelectionForSideDots,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

const HEATMAP_DOT_RADIUS = 16;
const HEATMAP_DOT_OPACITY_MIN = 0.22;
const HEATMAP_DOT_OPACITY_MAX = 0.52;
const MAX_HEATMAP_DOTS_PER_HIT = 500;

const LEG_RAW_DOTS_DENSITY_BANDWIDTH = 72;
const LEG_RAW_DOTS_DENSITY_CELL_SIZE = 2;
const LEG_RAW_DOTS_DENSITY_THRESHOLDS = 30;

const LEG_SILHOUETTE_STROKE_WIDTH = 3;
const LEG_GENERAL_RING_STROKE_WIDTH = 12;

const LEG_FILL_HIT_IDS = [...LEG_DETAIL_HIT_IDS] as const;

const LEG_COUNT_HIT_IDS = ["general", ...LEG_FILL_HIT_IDS] as const;

const LEG_HIT_LABELS: Record<string, string> = {
  general: "General",
  "left-thigh": "Thigh (left)",
  "right-thigh": "Thigh (right)",
  "left-crural-region": "Crural region (left)",
  "right-crural-region": "Crural region (right)",
};

type TooltipState = BodyMapTooltipState;

type LegPanelParse = {
  silhouetteD: string;
  generalOutlineD: string;
  shapeByHit: Map<string, LegShapeSpec>;
  viewBox: string;
};

const LEG_SILHOUETTE_ID = "base";
const LEG_GENERAL_OUTLINE_ID = "leg";

const LEG_FILL_PATH_IDS: Record<(typeof LEG_FILL_HIT_IDS)[number], string> = {
  "left-thigh": "LeftThigh",
  "right-thigh": "RightThigh",
  "left-crural-region": "LeftCrural",
  "right-crural-region": "RightCrural",
};

function readLegPathById(doc: Document, id: string): string {
  const pathEl = doc.querySelector(`path[id="${id}"]`);
  const d = pathEl?.getAttribute("d")?.trim();
  if (!d) {
    throw new Error(`Leg map SVG: expected path[id="${id}"].`);
  }
  return d;
}

function parseLegDetailSvg(svgText: string): LegPanelParse {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  const rawViewBox =
    svg?.getAttribute("viewBox")?.trim() ?? "0 0 522.10726 1710.7358";
  const viewBox = resolveLegDetailViewBox(rawViewBox);

  const silhouetteD = readLegPathById(doc, LEG_SILHOUETTE_ID);
  const generalOutlineD = readLegPathById(doc, LEG_GENERAL_OUTLINE_ID);

  const shapeByHit = new Map<string, LegShapeSpec>();
  for (const hitId of LEG_FILL_HIT_IDS) {
    shapeByHit.set(hitId, {
      kind: "path",
      d: readLegPathById(doc, LEG_FILL_PATH_IDS[hitId]),
    });
  }

  return {
    silhouetteD,
    generalOutlineD,
    shapeByHit,
    viewBox,
  };
}

function parseLegSvg(svgText: string | null): {
  parse: LegPanelParse | null;
  error: string | null;
} {
  if (!svgText) {
    return { parse: null, error: null };
  }
  try {
    return { parse: parseLegDetailSvg(svgText), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { parse: null, error: msg };
  }
}

function countsForPanel(
  papers: readonly ResearchPaper[],
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const k of LEG_COUNT_HIT_IDS) {
    m[k] = papers.filter((p) =>
      paperMatchesLegFineSelectionForSideDots(p, k),
    ).length;
  }
  return m;
}

export type LegBodyMapDetailProps = {
  variant: BodyMapVariant;
  papers: readonly ResearchPaper[];
};

export function LegBodyMapDetail({
  variant,
  papers,
}: LegBodyMapDetailProps) {
  const { toggleBodyMapChip, isBodyMapChipSelected, selectedBodyMapChips } =
    useResearchFilter();

  const uid = useId().replace(/:/g, "");

  const [svgText, setSvgText] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredHitId, setHoveredHitId] = useState<string | null>(null);
  const [dotsByHitId, setDotsByHitId] = useState<
    Record<string, { x: number; y: number }[]>
  >({});

  const legAreaDotsSampleCacheRef = useRef<
    Map<string, Record<string, { x: number; y: number }[]>>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/body-map/leg.svg")
      .then((r) => {
        if (!r.ok) throw new Error(`leg map HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setSvgText("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parsed = useMemo(() => parseLegSvg(svgText), [svgText]);
  const parseError = parsed.error;

  const paperIdsKey = useMemo(
    () => papers.map((p) => p.id).join("\0"),
    [papers],
  );

  const countsByHit = useMemo(() => {
    if (!parsed.parse) return {} as Record<string, number>;
    return countsForPanel(papers);
  }, [parsed.parse, papers, paperIdsKey]);

  const countColorDomain = useMemo<[number, number]>(() => {
    const vals = LEG_FILL_HIT_IDS.map((hitId) => countsByHit[hitId] ?? 0);
    const maxVal = Math.max(0, ...vals);
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [countsByHit]);

  useEffect(() => {
    if (!parsed.parse) return;
    let cancelled = false;
    const areaCacheKey = `${paperIdsKey}\0leg-detail`;

    if (variant === "rawDots") {
      const cached = areaDotsLruTouch(
        legAreaDotsSampleCacheRef.current,
        areaCacheKey,
      );
      if (cached) {
        setDotsByHitId(structuredClone(cached));
        return () => {
          cancelled = true;
        };
      }
    }

    const run = () => {
      if (cancelled) return;
      const next =
        variant === "rawDots"
          ? buildLegAreaDensityDotsByHitId(
              papers,
              parsed.parse!.shapeByHit,
              MAX_HEATMAP_DOTS_PER_HIT,
            )
          : buildLegDotsByHitId(
              papers,
              parsed.parse!.shapeByHit,
              MAX_HEATMAP_DOTS_PER_HIT,
            );

      if (variant === "rawDots") {
        areaDotsLruPut(
          legAreaDotsSampleCacheRef.current,
          areaCacheKey,
          structuredClone(next),
        );
      }

      if (!cancelled) setDotsByHitId(next);
    };

    const idle = window.requestIdleCallback?.bind(window);
    if (idle) {
      const id = idle(run, { timeout: 120 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    }

    const id = window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [parsed.parse, paperIdsKey, papers, variant]);

  const clearHover = useCallback(() => {
    setHoveredHitId(null);
    setTooltip(null);
  }, []);

  const handleFillHitEnter = useCallback(
    (hitId: string) => {
      return (e: PointerEvent<SVGElement>) => {
        setHoveredHitId(hitId);
        const bilateral = legBilateralTooltip(
          papers,
          hitId,
          e.clientX,
          e.clientY,
        );
        setTooltip(
          bilateral ??
            simpleBodyMapTooltip(
              LEG_HIT_LABELS[hitId] ?? hitId,
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
      toggleBodyMapChip("leg", hitId);
    },
    [toggleBodyMapChip],
  );

  const isHitSelected = useCallback(
    (hitId: string) => isBodyMapChipSelected("leg", hitId),
    [isBodyMapChipSelected],
  );

  const generalRingHovered = hoveredHitId === "general";
  const generalRingActive =
    generalRingHovered || isBodyMapChipSelected("leg", "general");

  const suppressSelectedFineFillWhileGeneralHover =
    generalRingHovered &&
    selectedBodyMapChips.some(
      (c) =>
        c.parent === "leg" &&
        normalizeBodyMapSubpart(c.subpart) !== "" &&
        normalizeBodyMapSubpart(c.subpart) !== "general",
    );

  const handleGeneralRingEnter = useCallback(
    (e: PointerEvent<SVGElement>) => {
      setHoveredHitId("general");
      setTooltip(
        simpleBodyMapTooltip(
          LEG_HIT_LABELS.general,
          countsByHit.general ?? 0,
          e.clientX,
          e.clientY,
        ),
      );
    },
    [countsByHit],
  );

  const mapsReady =
    parsed.parse && !parseError && svgText !== null && svgText !== "";

  return (
    <div className="body-map-root leg-detail-root">
      <div className="body-map-svg-wrap leg-detail-svg-wrap">
        {parseError ? (
          <p className="leg-detail-error" role="alert">
            {parseError}
          </p>
        ) : null}
        {svgText === null ? (
          <p className="leg-detail-loading">Loading leg map…</p>
        ) : null}
        {svgText === "" ? (
          <p className="leg-detail-error" role="alert">
            Could not load leg map SVG.
          </p>
        ) : null}
        {mapsReady ? (
          <div className="leg-detail-stage">
            <ArmDetailPanelMap
              sideLabel="Leg"
              viewBox={parsed.parse!.viewBox}
              svgClassName="body-map-svg leg-detail-svg"
              ariaLabel="Leg detail map: left and right thigh, crural region, and general outline"
              idPrefix={`${uid}-leg`}
              silhouetteD={parsed.parse!.silhouetteD}
              generalOutlineD={parsed.parse!.generalOutlineD}
              shapeByHit={parsed.parse!.shapeByHit}
              fillHitIds={LEG_FILL_HIT_IDS}
              dotsByHitId={dotsByHitId}
              countsByHit={countsByHit}
              hoveredHitId={hoveredHitId}
              variant={variant}
              heatmapDotRadius={HEATMAP_DOT_RADIUS}
              heatmapDotOpacityMin={HEATMAP_DOT_OPACITY_MIN}
              heatmapDotOpacityMax={HEATMAP_DOT_OPACITY_MAX}
              silhouetteStrokeWidth={LEG_SILHOUETTE_STROKE_WIDTH}
              generalRingStrokeWidth={LEG_GENERAL_RING_STROKE_WIDTH}
              rawDotsDensityBandwidth={LEG_RAW_DOTS_DENSITY_BANDWIDTH}
              rawDotsDensityCellSize={LEG_RAW_DOTS_DENSITY_CELL_SIZE}
              rawDotsDensityThresholds={LEG_RAW_DOTS_DENSITY_THRESHOLDS}
              countColorDomain={countColorDomain}
              isHitSelected={isHitSelected}
              suppressSelectedFineFillWhileGeneralHover={
                suppressSelectedFineFillWhileGeneralHover
              }
              onFillHitEnter={handleFillHitEnter}
              onPointerMove={handleMove}
              onPointerLeave={clearHover}
              onToggleHit={toggleHit}
              onGeneralRingEnter={handleGeneralRingEnter}
              onGeneralRingClick={() => toggleBodyMapChip("leg", "general")}
              generalRingActive={generalRingActive}
              generalRingHovered={generalRingHovered}
              showGeneralRing
            />
          </div>
        ) : null}
      </div>

      {mapsReady ? (
        <BodyMapHeatmapLegend
          variant={variant}
          colorDomain={countColorDomain}
          gradientId={`${uid}-leg-legend-${variant}`}
          className="leg-detail-legend"
          caption={
            variant === "countHeatmap"
              ? `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Hover each leg subregion or the leg outline for whole-leg (general).`
              : `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Uses the same d3 density smoothing as the full-body map. Hover left/right subregions or the leg outline for whole-leg (general).`
          }
        />
      ) : null}

      <BodyMapHoverTooltip tooltip={tooltip} />
    </div>
  );
}
