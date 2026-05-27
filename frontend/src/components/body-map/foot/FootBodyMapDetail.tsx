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
  footBilateralTooltip,
  simpleBodyMapTooltip,
} from "@/lib/research/bodyMapBilateralTooltips";
import { MAX_HEATMAP_DOTS_PER_REGION } from "../bodyMapSampleDots";
import {
  buildFootAreaDensityDotsByHitId,
  buildFootDotsByHitId,
  FOOT_DETAIL_VIEWBOX,
  type FootShapeSpec,
} from "./footDetailSampleDots";
import type { BodyMapVariant } from "../bodyMapVariant";
import { BodyMapHeatmapLegend } from "../shared/BodyMapHeatmapLegend";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { normalizeBodyMapSubpart } from "@/lib/research/bodyMapChipSelection";
import {
  FOOT_DETAIL_HIT_IDS,
  paperMatchesFootFineSelectionForSideDots,
  paperMatchesFootFineSelectionForSideAreaView,
  type FootDetailSide,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

const HEATMAP_DOT_RADIUS = 14;
const HEATMAP_DOT_OPACITY_MIN = 0.22;
const HEATMAP_DOT_OPACITY_MAX = 0.52;
const MAX_HEATMAP_DOTS_PER_HIT = MAX_HEATMAP_DOTS_PER_REGION;

const FOOT_RAW_DOTS_DENSITY_BANDWIDTH = 58;
const FOOT_RAW_DOTS_DENSITY_CELL_SIZE = 2;
const FOOT_RAW_DOTS_DENSITY_THRESHOLDS = 30;

const FOOT_SILHOUETTE_STROKE_WIDTH = 2;
const FOOT_GENERAL_RING_STROKE_WIDTH = 5;

const FOOT_FILL_HIT_IDS = [...FOOT_DETAIL_HIT_IDS] as const;

const FOOT_COUNT_HIT_IDS = ["general", ...FOOT_FILL_HIT_IDS] as const;

const FOOT_HIT_LABELS: Record<string, string> = {
  general: "General",
  sole: "Sole",
  toes: "Toes",
};

type TooltipState = BodyMapTooltipState;

type FootPanelParse = {
  silhouetteD: string;
  silhouetteTransform?: string;
  generalOutlineD: string;
  generalOutlineTransform?: string;
  shapeByHit: Map<string, FootShapeSpec>;
  viewBox: string;
  viewBoxWidth: number;
};

const FOOT_SILHOUETTE_ID = "base";
const FOOT_OUTLINE_ID = "outline";

function ancestorTransformChain(el: Element): string | undefined {
  const transformParts: string[] = [];
  let node: Element | null = el.parentElement;
  while (node && node.tagName.toLowerCase() !== "svg") {
    const groupTransform = node.getAttribute("transform")?.trim();
    if (groupTransform) transformParts.unshift(groupTransform);
    node = node.parentElement;
  }
  const ownTransform = el.getAttribute("transform")?.trim();
  if (ownTransform) transformParts.push(ownTransform);
  return transformParts.length > 0 ? transformParts.join(" ") : undefined;
}

function readFootShapeById(
  doc: Document,
  id: string,
): FootShapeSpec | null {
  const pathEl = doc.querySelector(`path[id="${id}"]`);
  if (!pathEl) return null;
  const d = pathEl.getAttribute("d")?.trim();
  if (!d) return null;
  return { kind: "path", d, transform: ancestorTransformChain(pathEl) };
}

function readFootPathById(
  doc: Document,
  id: string,
): { d: string; transform?: string } {
  const spec = readFootShapeById(doc, id);
  if (!spec || spec.kind !== "path") {
    throw new Error(`Foot map SVG: expected path[id="${id}"].`);
  }
  return { d: spec.d, transform: spec.transform };
}

function parseFootDetailSvg(svgText: string): FootPanelParse {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  const viewBox = svg?.getAttribute("viewBox")?.trim() ?? FOOT_DETAIL_VIEWBOX;
  const vbParts = viewBox.split(/\s+/).map(Number);
  const viewBoxWidth = vbParts[2] ?? 0;

  const silhouette = readFootPathById(doc, FOOT_SILHOUETTE_ID);
  const outline = readFootPathById(doc, FOOT_OUTLINE_ID);

  const shapeByHit = new Map<string, FootShapeSpec>();
  for (const hitId of FOOT_FILL_HIT_IDS) {
    const spec = readFootShapeById(doc, hitId);
    if (!spec) {
      throw new Error(`Foot map SVG: expected path[id="${hitId}"].`);
    }
    shapeByHit.set(hitId, spec);
  }

  return {
    silhouetteD: silhouette.d,
    silhouetteTransform: silhouette.transform,
    generalOutlineD: outline.d,
    generalOutlineTransform: outline.transform,
    shapeByHit,
    viewBox,
    viewBoxWidth,
  };
}

function parseFootSvg(svgText: string | null): {
  parse: FootPanelParse | null;
  error: string | null;
} {
  if (!svgText) {
    return { parse: null, error: null };
  }
  try {
    return { parse: parseFootDetailSvg(svgText), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { parse: null, error: msg };
  }
}

function countsForSide(
  papers: readonly ResearchPaper[],
  panelSide: FootDetailSide,
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const k of FOOT_COUNT_HIT_IDS) {
    m[k] = papers.filter((p) =>
      paperMatchesFootFineSelectionForSideDots(p, k, panelSide),
    ).length;
  }
  return m;
}

function countsForSideAreaView(
  papers: readonly ResearchPaper[],
  panelSide: FootDetailSide,
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const k of FOOT_COUNT_HIT_IDS) {
    m[k] = papers.filter((p) =>
      paperMatchesFootFineSelectionForSideAreaView(p, k, panelSide),
    ).length;
  }
  return m;
}

export type FootBodyMapDetailProps = {
  variant: BodyMapVariant;
  papers: readonly ResearchPaper[];
};

export function FootBodyMapDetail({
  variant,
  papers,
}: FootBodyMapDetailProps) {
  const { toggleBodyMapChip, isBodyMapChipSelected, selectedBodyMapChips } =
    useResearchFilter();

  const uid = useId().replace(/:/g, "");

  const [svgText, setSvgText] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [dotsBySide, setDotsBySide] = useState<
    Record<FootDetailSide, Record<string, { x: number; y: number }[]>>
  >({ left: {}, right: {} });

  const footAreaDotsSampleCacheRef = useRef<
    Map<string, Record<FootDetailSide, Record<string, { x: number; y: number }[]>>>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/body-map/foot.svg")
      .then((r) => {
        if (!r.ok) throw new Error(`foot map HTTP ${r.status}`);
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

  const parsed = useMemo(() => parseFootSvg(svgText), [svgText]);
  const parseError = parsed.error;

  const paperIdsKey = useMemo(
    () => papers.map((p) => p.id).join("\0"),
    [papers],
  );

  const countsBySide = useMemo(() => {
    if (!parsed.parse) {
      return {
        left: {} as Record<string, number>,
        right: {} as Record<string, number>,
      };
    }
    const countFn =
      variant === "rawDots" ? countsForSideAreaView : countsForSide;
    return {
      left: countFn(papers, "left"),
      right: countFn(papers, "right"),
    };
  }, [parsed.parse, papers, paperIdsKey, variant]);

  const combinedFillCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const hitId of FOOT_FILL_HIT_IDS) {
      m[hitId] =
        variant === "rawDots"
          ? Math.max(
              countsBySide.left[hitId] ?? 0,
              countsBySide.right[hitId] ?? 0,
            )
          : (countsBySide.left[hitId] ?? 0) + (countsBySide.right[hitId] ?? 0);
    }
    return m;
  }, [countsBySide, variant]);

  const countColorDomain = useMemo<[number, number]>(() => {
    const vals = Object.values(combinedFillCounts);
    const maxVal = Math.max(0, ...vals);
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [combinedFillCounts]);

  useEffect(() => {
    if (!parsed.parse) return;
    let cancelled = false;
    const areaCacheKey = `${paperIdsKey}\0foot-detail`;

    if (variant === "rawDots") {
      const cached = areaDotsLruTouch(
        footAreaDotsSampleCacheRef.current,
        areaCacheKey,
      );
      if (cached) {
        setDotsBySide(structuredClone(cached));
        return () => {
          cancelled = true;
        };
      }
    }

    const run = () => {
      if (cancelled) return;
      const parse = parsed.parse!;
      const next: Record<
        FootDetailSide,
        Record<string, { x: number; y: number }[]>
      > = {
        left:
          variant === "rawDots"
            ? buildFootAreaDensityDotsByHitId(
                papers,
                "left",
                parse.shapeByHit,
                MAX_HEATMAP_DOTS_PER_HIT,
                parse.viewBoxWidth,
              )
            : buildFootDotsByHitId(
                papers,
                "left",
                parse.shapeByHit,
                MAX_HEATMAP_DOTS_PER_HIT,
                parse.viewBoxWidth,
              ),
        right:
          variant === "rawDots"
            ? buildFootAreaDensityDotsByHitId(
                papers,
                "right",
                parse.shapeByHit,
                MAX_HEATMAP_DOTS_PER_HIT,
                parse.viewBoxWidth,
              )
            : buildFootDotsByHitId(
                papers,
                "right",
                parse.shapeByHit,
                MAX_HEATMAP_DOTS_PER_HIT,
                parse.viewBoxWidth,
              ),
      };

      if (variant === "rawDots") {
        areaDotsLruPut(
          footAreaDotsSampleCacheRef.current,
          areaCacheKey,
          structuredClone(next),
        );
      }

      if (!cancelled) setDotsBySide(next);
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
    setHoveredKey(null);
    setTooltip(null);
  }, []);

  const handleFillHitEnter = useCallback(
    (panelSide: FootDetailSide) => {
      return (hitId: string) => {
        return (e: PointerEvent<SVGElement>) => {
          setHoveredKey(`${panelSide}:${hitId}`);
          setTooltip(
            hitId === "general"
              ? simpleBodyMapTooltip(
                  FOOT_HIT_LABELS.general,
                  countsBySide[panelSide].general ?? 0,
                  e.clientX,
                  e.clientY,
                )
              : footBilateralTooltip(
                  papers,
                  hitId,
                  panelSide,
                  FOOT_HIT_LABELS[hitId] ?? hitId,
                  e.clientX,
                  e.clientY,
                ),
          );
        };
      };
    },
    [countsBySide, papers],
  );

  const handleMove = useCallback((e: PointerEvent<SVGElement>) => {
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
    );
  }, []);

  const toggleHit = useCallback(
    (panelSide: FootDetailSide) => {
      return (hitId: string) => {
        toggleBodyMapChip("foot", hitId, panelSide);
      };
    },
    [toggleBodyMapChip],
  );

  const isHitSelected = useCallback(
    (panelSide: FootDetailSide) => {
      return (hitId: string) =>
        isBodyMapChipSelected("foot", hitId, panelSide);
    },
    [isBodyMapChipSelected],
  );

  const generalRingHovered =
    hoveredKey === "left:general" || hoveredKey === "right:general";

  const suppressSelectedFineFillWhileGeneralHover =
    generalRingHovered &&
    selectedBodyMapChips.some(
      (c) =>
        c.parent === "foot" &&
        normalizeBodyMapSubpart(c.subpart) !== "" &&
        normalizeBodyMapSubpart(c.subpart) !== "general",
    );

  const handleGeneralRingEnter = useCallback(
    (panelSide: FootDetailSide) => {
      return (e: PointerEvent<SVGElement>) => {
        setHoveredKey(`${panelSide}:general`);
        setTooltip(
          simpleBodyMapTooltip(
            FOOT_HIT_LABELS.general,
            countsBySide[panelSide].general ?? 0,
            e.clientX,
            e.clientY,
          ),
        );
      };
    },
    [countsBySide],
  );

  const mapsReady =
    parsed.parse &&
    !parseError &&
    svgText !== null &&
    svgText !== "";

  const panelCommon = {
    variant,
    fillHitIds: FOOT_FILL_HIT_IDS,
    heatmapDotRadius: HEATMAP_DOT_RADIUS,
    heatmapDotOpacityMin: HEATMAP_DOT_OPACITY_MIN,
    heatmapDotOpacityMax: HEATMAP_DOT_OPACITY_MAX,
    silhouetteStrokeWidth: FOOT_SILHOUETTE_STROKE_WIDTH,
    generalRingStrokeWidth: FOOT_GENERAL_RING_STROKE_WIDTH,
    rawDotsDensityBandwidth: FOOT_RAW_DOTS_DENSITY_BANDWIDTH,
    rawDotsDensityCellSize: FOOT_RAW_DOTS_DENSITY_CELL_SIZE,
    rawDotsDensityThresholds: FOOT_RAW_DOTS_DENSITY_THRESHOLDS,
    countColorDomain,
    suppressSelectedFineFillWhileGeneralHover,
    onPointerMove: handleMove,
    onPointerLeave: clearHover,
    generalRingHovered,
    showGeneralRing: true,
  };

  const renderPanel = (panelSide: FootDetailSide, sideLabel: string) => {
    const parse = parsed.parse!;
    const idPrefix = `${uid}-foot-${panelSide}`;
    const hoveredHitId = hoveredKey?.startsWith(`${panelSide}:`)
      ? (hoveredKey.slice(panelSide.length + 1) ?? null)
      : null;
    const panelGeneralActive =
      hoveredKey === `${panelSide}:general` ||
      isBodyMapChipSelected("foot", "general", panelSide);

    return (
      <ArmDetailPanelMap
        sideLabel={sideLabel}
        viewBox={parse.viewBox}
        svgClassName="body-map-svg foot-detail-svg"
        ariaLabel={`${sideLabel} foot: sole, toes, and general outline`}
        idPrefix={idPrefix}
        silhouetteD={parse.silhouetteD}
        silhouetteTransform={parse.silhouetteTransform}
        generalOutlineD={parse.generalOutlineD}
        generalOutlineTransform={parse.generalOutlineTransform}
        shapeByHit={parse.shapeByHit}
        dotsByHitId={dotsBySide[panelSide]}
        countsByHit={countsBySide[panelSide]}
        hoveredHitId={hoveredHitId}
        horizontalFlip={panelSide === "right"}
        isHitSelected={isHitSelected(panelSide)}
        onToggleHit={toggleHit(panelSide)}
        onFillHitEnter={handleFillHitEnter(panelSide)}
        onGeneralRingEnter={handleGeneralRingEnter(panelSide)}
        onGeneralRingClick={() =>
          toggleBodyMapChip("foot", "general", panelSide)
        }
        generalRingActive={panelGeneralActive}
        {...panelCommon}
      />
    );
  };

  return (
    <div className="body-map-root foot-detail-root">
      <div className="body-map-svg-wrap foot-detail-svg-wrap">
        {parseError ? (
          <p className="foot-detail-error" role="alert">
            {parseError}
          </p>
        ) : null}
        {svgText === null ? (
          <p className="foot-detail-loading">Loading foot map…</p>
        ) : null}
        {svgText === "" ? (
          <p className="foot-detail-error" role="alert">
            Could not load foot map SVG.
          </p>
        ) : null}
        {mapsReady ? (
          <div className="foot-detail-stage">
            <div className="foot-detail-side-panel">
              {renderPanel("left", "Left")}
              <p className="foot-detail-view-label">Left</p>
            </div>
            <div className="foot-detail-side-panel">
              {renderPanel("right", "Right")}
              <p className="foot-detail-view-label">Right</p>
            </div>
          </div>
        ) : null}
      </div>

      {mapsReady ? (
        <BodyMapHeatmapLegend
          variant={variant}
          colorDomain={countColorDomain}
          gradientId={`${uid}-foot-legend-${variant}`}
          className="foot-detail-legend"
          caption={
            variant === "countHeatmap"
              ? `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Hover sole, toes, or the outline for whole-foot (general). Unspecified side is split across left and right feet.`
              : `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Uses the same d3 density smoothing as the full-body map. Hover subregions or the outline for whole-foot (general). Unspecified side is split across left and right feet.`
          }
        />
      ) : null}

      <BodyMapHoverTooltip tooltip={tooltip} />
    </div>
  );
}
