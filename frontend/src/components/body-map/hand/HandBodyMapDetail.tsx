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
} from "@/components/body-map/shared/bodyMapAreaDotsCache";
import { ArmDetailPanelMap } from "@/components/body-map/arm/ArmDetailPanelMap";
import { BodyMapAreaViewLoadingScope } from "@/components/body-map/shared/BodyMapAreaViewLoadingScope";
import { BodyMapHoverTooltip } from "@/components/body-map/shared/BodyMapHoverTooltip";
import type { BodyMapTooltipState } from "@/components/body-map/shared/BodyMapHoverTooltip";
import {
  explicitSideBilateralTooltip,
  simpleBodyMapTooltip,
} from "@/lib/research/bodyMapBilateralTooltips";
import { MAX_HEATMAP_DOTS_PER_REGION } from "@/components/body-map/bodyMapSampleDots";
import {
  buildHandAreaDensityDotsByHitId,
  buildHandDotsByHitId,
  HAND_INNER_DETAIL_VIEWBOX,
  HAND_OUTER_DETAIL_VIEWBOX,
  type HandShapeSpec,
} from "@/components/body-map/hand/handDetailSampleDots";
import type { BodyMapVariant } from "@/components/body-map/bodyMapVariant";
import { BodyMapHeatmapLegend } from "@/components/body-map/shared/BodyMapHeatmapLegend";
import {
  bodyMapDetailLegendCaption,
  useBodyMapHelpContext,
} from "@/components/body-map/shared/bodyMapHelpText";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { publicAssetUrl } from "@/lib/publicAssetUrl";
import { BODY_MAP_DETAIL_SELECTION_MODE } from "@/lib/research/bodyMapDetailSelectionMode";
import { normalizeBodyMapSubpart } from "@/lib/research/bodyMapChipSelection";
import {
  HAND_INNER_DETAIL_HIT_IDS,
  HAND_OUTER_DETAIL_HIT_IDS,
  paperMatchesHandFineSelection,
  paperMatchesHandFineSelectionForPanelDots,
  paperMatchesHandFineSelectionForPanelAreaView,
  type HandDetailPanel,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

const HEATMAP_DOT_RADIUS = 20;
const HEATMAP_DOT_OPACITY_MIN = 0.22;
const HEATMAP_DOT_OPACITY_MAX = 0.52;
const MAX_HEATMAP_DOTS_PER_HIT = MAX_HEATMAP_DOTS_PER_REGION;

const HAND_RAW_DOTS_DENSITY_BANDWIDTH = 52;
const HAND_RAW_DOTS_DENSITY_CELL_SIZE = 2;
const HAND_RAW_DOTS_DENSITY_THRESHOLDS = 30;

const HAND_SILHOUETTE_STROKE_WIDTH = 2;
const HAND_GENERAL_RING_STROKE_WIDTH = 5;

const HAND_HIT_LABELS: Record<string, string> = {
  general: "General",
  palm: "Palm",
  fingertips: "Fingertips",
  fingers: "Fingers",
  "thenar-eminence": "Thenar eminence",
  "hand-back": "Hand back",
};

type TooltipState = BodyMapTooltipState;

type HandSurfaceParse = {
  silhouetteD: string;
  silhouetteTransform?: string;
  generalOutlineD: string;
  generalOutlineTransform?: string;
  shapeByHit: Map<string, HandShapeSpec>;
  viewBox: string;
  fillHitIds: readonly string[];
  viewBoxWidth: number;
};

const HAND_INNER_SILHOUETTE_ID = "path1";
const HAND_OUTER_SILHOUETTE_ID = "base";
const HAND_OUTER_HAND_BACK_ID = "hand-back";
const HAND_OUTLINE_ID = "outline";

const HAND_INNER_FILL_HIT_IDS = [
  "palm",
  "fingers",
  "fingertips",
  "thenar-eminence",
] as const;

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

function readHandShapeById(doc: Document, id: string): HandShapeSpec | null {
  const pathEl = doc.querySelector(`path[id="${id}"]`);
  if (pathEl) {
    const d = pathEl.getAttribute("d")?.trim();
    if (!d) return null;
    return { kind: "path", d, transform: ancestorTransformChain(pathEl) };
  }

  const ellEl = doc.querySelector(`ellipse[id="${id}"]`);
  if (ellEl) {
    const cx = Number(ellEl.getAttribute("cx"));
    const cy = Number(ellEl.getAttribute("cy"));
    const rx = Number(ellEl.getAttribute("rx"));
    const ry = Number(ellEl.getAttribute("ry"));
    if (![cx, cy, rx, ry].every((n) => Number.isFinite(n))) return null;
    return {
      kind: "ellipse",
      cx,
      cy,
      rx,
      ry,
      transform: ancestorTransformChain(ellEl),
    };
  }

  return null;
}

function readHandPathById(
  doc: Document,
  id: string,
): { d: string; transform?: string } {
  const spec = readHandShapeById(doc, id);
  if (!spec || spec.kind !== "path") {
    throw new Error(`Hand map SVG: expected path[id="${id}"].`);
  }
  return { d: spec.d, transform: spec.transform };
}

function parseHandSurfaceSvg(
  svgText: string,
  surface: HandDetailPanel["surface"],
): HandSurfaceParse {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  const defaultViewBox =
    surface === "inner" ? HAND_INNER_DETAIL_VIEWBOX : HAND_OUTER_DETAIL_VIEWBOX;
  const viewBox = svg?.getAttribute("viewBox")?.trim() ?? defaultViewBox;
  const vbParts = viewBox.split(/\s+/).map(Number);
  const viewBoxWidth = vbParts[2] ?? 0;

  const silhouetteId =
    surface === "inner" ? HAND_INNER_SILHOUETTE_ID : HAND_OUTER_SILHOUETTE_ID;
  const silhouette = readHandPathById(doc, silhouetteId);
  const outline = readHandPathById(doc, HAND_OUTLINE_ID);

  const fillHitIds =
    surface === "inner" ? HAND_INNER_FILL_HIT_IDS : HAND_OUTER_DETAIL_HIT_IDS;

  const shapeByHit = new Map<string, HandShapeSpec>();
  if (surface === "inner") {
    for (const hitId of HAND_INNER_FILL_HIT_IDS) {
      const spec = readHandShapeById(doc, hitId);
      if (spec) shapeByHit.set(hitId, spec);
    }
  } else {
    const handBack = readHandShapeById(doc, HAND_OUTER_HAND_BACK_ID);
    if (!handBack) {
      throw new Error(
        `Hand map SVG: expected path[id="${HAND_OUTER_HAND_BACK_ID}"].`,
      );
    }
    shapeByHit.set("hand-back", handBack);
  }

  return {
    silhouetteD: silhouette.d,
    silhouetteTransform: silhouette.transform,
    generalOutlineD: outline.d,
    generalOutlineTransform: outline.transform,
    shapeByHit,
    viewBox,
    fillHitIds,
    viewBoxWidth,
  };
}

function parseHandSvg(
  svgText: string | null,
  surface: HandDetailPanel["surface"],
): {
  parse: HandSurfaceParse | null;
  error: string | null;
} {
  if (!svgText) {
    return { parse: null, error: null };
  }
  try {
    return { parse: parseHandSurfaceSvg(svgText, surface), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { parse: null, error: msg };
  }
}

function panelKey(panel: HandDetailPanel): string {
  return `${panel.surface}:${panel.side}`;
}

function countsForPanel(
  papers: readonly ResearchPaper[],
  panel: HandDetailPanel,
  fillHitIds: readonly string[],
): Record<string, number> {
  const m: Record<string, number> = { general: 0 };
  for (const k of fillHitIds) {
    m[k] = 0;
  }
  for (const k of Object.keys(m)) {
    m[k] = papers.filter((p) =>
      paperMatchesHandFineSelectionForPanelDots(p, k, panel),
    ).length;
  }
  return m;
}

function countsForPanelAreaView(
  papers: readonly ResearchPaper[],
  panel: HandDetailPanel,
  fillHitIds: readonly string[],
): Record<string, number> {
  const m: Record<string, number> = { general: 0 };
  for (const k of fillHitIds) {
    m[k] = 0;
  }
  for (const k of Object.keys(m)) {
    m[k] = papers.filter((p) =>
      paperMatchesHandFineSelectionForPanelAreaView(p, k, panel),
    ).length;
  }
  return m;
}

const HAND_PANELS: readonly HandDetailPanel[] = [
  { surface: "inner", side: "left" },
  { surface: "inner", side: "right" },
  { surface: "outer", side: "left" },
  { surface: "outer", side: "right" },
] as const;

const PANEL_LABELS: Record<string, string> = {
  "inner:left": "Inner · Left",
  "inner:right": "Inner · Right",
  "outer:left": "Outer · Left",
  "outer:right": "Outer · Right",
};

export type HandBodyMapDetailProps = {
  variant: BodyMapVariant;
  papers: readonly ResearchPaper[];
};

export function HandBodyMapDetail({ variant, papers }: HandBodyMapDetailProps) {
  const { prefersHover } = useBodyMapHelpContext();
  const { toggleBodyMapChip, isBodyMapChipSelected, selectedBodyMapChips } =
    useResearchFilter();

  const uid = useId().replace(/:/g, "");

  const [innerSvgText, setInnerSvgText] = useState<string | null>(null);
  const [outerSvgText, setOuterSvgText] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [dotsByPanel, setDotsByPanel] = useState<
    Record<string, Record<string, { x: number; y: number }[]>>
  >({});

  const handAreaDotsSampleCacheRef = useRef<
    Map<string, Record<string, Record<string, { x: number; y: number }[]>>>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(publicAssetUrl("body-map/hand-inner.svg")).then((r) => {
        if (!r.ok) throw new Error(`hand inner map HTTP ${r.status}`);
        return r.text();
      }),
      fetch(publicAssetUrl("body-map/hand-outer.svg")).then((r) => {
        if (!r.ok) throw new Error(`hand outer map HTTP ${r.status}`);
        return r.text();
      }),
    ])
      .then(([inner, outer]) => {
        if (!cancelled) {
          setInnerSvgText(inner);
          setOuterSvgText(outer);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInnerSvgText("");
          setOuterSvgText("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const innerParsed = useMemo(
    () => parseHandSvg(innerSvgText, "inner"),
    [innerSvgText],
  );
  const outerParsed = useMemo(
    () => parseHandSvg(outerSvgText, "outer"),
    [outerSvgText],
  );

  const parseError = innerParsed.error ?? outerParsed.error;

  const paperIdsKey = useMemo(
    () => papers.map((p) => p.id).join("\0"),
    [papers],
  );

  const countsByPanel = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    if (!innerParsed.parse || !outerParsed.parse) return out;
    const countFn =
      variant === "rawDots" ? countsForPanelAreaView : countsForPanel;
    for (const panel of HAND_PANELS) {
      const parse =
        panel.surface === "inner" ? innerParsed.parse : outerParsed.parse;
      out[panelKey(panel)] = countFn(papers, panel, parse.fillHitIds);
    }
    return out;
  }, [innerParsed.parse, outerParsed.parse, papers, paperIdsKey, variant]);

  const combinedFillCounts = useMemo(() => {
    const m: Record<string, number> = {};
    const allHits = [
      ...HAND_INNER_DETAIL_HIT_IDS,
      ...HAND_OUTER_DETAIL_HIT_IDS,
    ];
    for (const hitId of allHits) {
      let aggregate = 0;
      for (const panel of HAND_PANELS) {
        if (
          panel.surface === "inner" &&
          !(HAND_INNER_DETAIL_HIT_IDS as readonly string[]).includes(hitId)
        ) {
          continue;
        }
        if (
          panel.surface === "outer" &&
          !(HAND_OUTER_DETAIL_HIT_IDS as readonly string[]).includes(hitId)
        ) {
          continue;
        }
        const n = countsByPanel[panelKey(panel)]?.[hitId] ?? 0;
        aggregate =
          variant === "rawDots" ? Math.max(aggregate, n) : aggregate + n;
      }
      m[hitId] = aggregate;
    }
    return m;
  }, [countsByPanel, variant]);

  const countColorDomain = useMemo<[number, number]>(() => {
    const vals = Object.values(combinedFillCounts);
    const maxVal = Math.max(0, ...vals);
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [combinedFillCounts]);

  useEffect(() => {
    if (!innerParsed.parse || !outerParsed.parse) return;
    let cancelled = false;
    const areaCacheKey = `${paperIdsKey}\0hand-detail`;

    if (variant === "rawDots") {
      const cached = areaDotsLruTouch(
        handAreaDotsSampleCacheRef.current,
        areaCacheKey,
      );
      if (cached) {
        setDotsByPanel(structuredClone(cached));
        return () => {
          cancelled = true;
        };
      }
    }

    const run = () => {
      if (cancelled) return;
      const next: Record<
        string,
        Record<string, { x: number; y: number }[]>
      > = {};
      for (const panel of HAND_PANELS) {
        const parse =
          panel.surface === "inner" ? innerParsed.parse! : outerParsed.parse!;
        const key = panelKey(panel);
        next[key] =
          variant === "rawDots"
            ? buildHandAreaDensityDotsByHitId(
                papers,
                panel,
                parse.shapeByHit,
                MAX_HEATMAP_DOTS_PER_HIT,
                parse.viewBoxWidth,
              )
            : buildHandDotsByHitId(
                papers,
                panel,
                parse.shapeByHit,
                MAX_HEATMAP_DOTS_PER_HIT,
                parse.viewBoxWidth,
              );
      }

      if (variant === "rawDots") {
        areaDotsLruPut(
          handAreaDotsSampleCacheRef.current,
          areaCacheKey,
          structuredClone(next),
        );
      }

      if (!cancelled) setDotsByPanel(next);
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
  }, [innerParsed.parse, outerParsed.parse, paperIdsKey, papers, variant]);

  const clearHover = useCallback(() => {
    setHoveredKey(null);
    setTooltip(null);
  }, []);

  const handleFillHitEnter = useCallback(
    (panel: HandDetailPanel) => {
      return (hitId: string) => {
        return (e: PointerEvent<SVGElement>) => {
          setHoveredKey(`${panelKey(panel)}:${hitId}`);
          setTooltip(
            hitId === "general"
              ? simpleBodyMapTooltip(
                  HAND_HIT_LABELS.general,
                  countsByPanel[panelKey(panel)]?.general ?? 0,
                  e.clientX,
                  e.clientY,
                )
              : explicitSideBilateralTooltip(
                  papers,
                  HAND_HIT_LABELS[hitId] ?? hitId,
                  "hand",
                  hitId,
                  panel.side,
                  (p) => paperMatchesHandFineSelection(p, hitId),
                  e.clientX,
                  e.clientY,
                ),
          );
        };
      };
    },
    [countsByPanel, papers],
  );

  const handleMove = useCallback((e: PointerEvent<SVGElement>) => {
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
    );
  }, []);

  const toggleHit = useCallback(
    (panel: HandDetailPanel) => {
      return (hitId: string) => {
        toggleBodyMapChip("hand", hitId, panel.side);
      };
    },
    [toggleBodyMapChip],
  );

  const isHitSelected = useCallback(
    (panel: HandDetailPanel) => {
      return (hitId: string) =>
        isBodyMapChipSelected("hand", hitId, panel.side);
    },
    [isBodyMapChipSelected],
  );

  const generalRingHovered = HAND_PANELS.some(
    (panel) => hoveredKey === `${panelKey(panel)}:general`,
  );

  const suppressSelectedFineFillWhileGeneralHover =
    generalRingHovered &&
    selectedBodyMapChips.some(
      (c) =>
        c.parent === "hand" &&
        normalizeBodyMapSubpart(c.subpart) !== "" &&
        normalizeBodyMapSubpart(c.subpart) !== "general",
    );

  const handleGeneralRingEnter = useCallback(
    (panel: HandDetailPanel) => {
      return (e: PointerEvent<SVGElement>) => {
        setHoveredKey(`${panelKey(panel)}:general`);
        setTooltip(
          simpleBodyMapTooltip(
            HAND_HIT_LABELS.general,
            countsByPanel[panelKey(panel)]?.general ?? 0,
            e.clientX,
            e.clientY,
          ),
        );
      };
    },
    [countsByPanel, papers],
  );

  const mapsReady =
    innerParsed.parse &&
    outerParsed.parse &&
    !parseError &&
    innerSvgText !== null &&
    outerSvgText !== null &&
    innerSvgText !== "" &&
    outerSvgText !== "";

  const panelCommon = {
    variant,
    heatmapDotRadius: HEATMAP_DOT_RADIUS,
    heatmapDotOpacityMin: HEATMAP_DOT_OPACITY_MIN,
    heatmapDotOpacityMax: HEATMAP_DOT_OPACITY_MAX,
    silhouetteStrokeWidth: HAND_SILHOUETTE_STROKE_WIDTH,
    generalRingStrokeWidth: HAND_GENERAL_RING_STROKE_WIDTH,
    rawDotsDensityBandwidth: HAND_RAW_DOTS_DENSITY_BANDWIDTH,
    rawDotsDensityCellSize: HAND_RAW_DOTS_DENSITY_CELL_SIZE,
    rawDotsDensityThresholds: HAND_RAW_DOTS_DENSITY_THRESHOLDS,
    countColorDomain,
    suppressSelectedFineFillWhileGeneralHover,
    onPointerMove: handleMove,
    onPointerLeave: clearHover,
    generalRingHovered,
  };

  const renderPanel = (panel: HandDetailPanel) => {
    const parse =
      panel.surface === "inner" ? innerParsed.parse! : outerParsed.parse!;
    const key = panelKey(panel);
    const idPrefix = `${uid}-hand-${panel.surface}-${panel.side}`;
    const hoveredHitId = (() => {
      if (!hoveredKey) return null;
      const splitAt = hoveredKey.lastIndexOf(":");
      if (splitAt < 0) return null;
      const hoverPanel = hoveredKey.slice(0, splitAt);
      const hoverHit = hoveredKey.slice(splitAt + 1);
      if (!hoverHit) return null;
      if (BODY_MAP_DETAIL_SELECTION_MODE === "merged") return hoverHit;
      return hoverPanel === key ? hoverHit : null;
    })();
    const sideLabel = PANEL_LABELS[key] ?? key;
    const panelGeneralActive =
      hoveredHitId === "general" ||
      isBodyMapChipSelected("hand", "general", panel.side);

    return (
      <ArmDetailPanelMap
        sideLabel={sideLabel}
        viewBox={parse.viewBox}
        svgClassName="body-map-svg hand-detail-svg"
        ariaLabel={`${sideLabel} hand detail map`}
        idPrefix={idPrefix}
        silhouetteD={parse.silhouetteD}
        silhouetteTransform={parse.silhouetteTransform}
        generalOutlineD={parse.generalOutlineD}
        generalOutlineTransform={parse.generalOutlineTransform}
        shapeByHit={parse.shapeByHit}
        fillHitIds={parse.fillHitIds}
        dotsByHitId={dotsByPanel[key] ?? {}}
        countsByHit={countsByPanel[key] ?? {}}
        hoveredHitId={hoveredHitId}
        horizontalFlip={panel.side === "right"}
        showGeneralRing={panel.surface === "inner"}
        isHitSelected={isHitSelected(panel)}
        onToggleHit={toggleHit(panel)}
        onFillHitEnter={handleFillHitEnter(panel)}
        onGeneralRingEnter={handleGeneralRingEnter(panel)}
        onGeneralRingClick={() =>
          toggleBodyMapChip("hand", "general", panel.side)
        }
        generalRingActive={panelGeneralActive}
        {...panelCommon}
      />
    );
  };

  return (
    <div className="body-map-root hand-detail-root">
      <div className="body-map-svg-wrap hand-detail-svg-wrap">
        {parseError ? (
          <p className="hand-detail-error" role="alert">
            {parseError}
          </p>
        ) : null}
        {innerSvgText === null || outerSvgText === null ? (
          <p className="hand-detail-loading">Loading hand maps…</p>
        ) : null}
        {innerSvgText === "" || outerSvgText === "" ? (
          <p className="hand-detail-error" role="alert">
            Could not load hand map SVG.
          </p>
        ) : null}
        {mapsReady ? (
          <BodyMapAreaViewLoadingScope className="hand-detail-stage">
            <div className="hand-detail-row">
              <div className="hand-detail-panel">
                {renderPanel({ surface: "inner", side: "left" })}
                <p className="hand-detail-view-label">Inner · Left</p>
              </div>
              <div className="hand-detail-panel">
                {renderPanel({ surface: "inner", side: "right" })}
                <p className="hand-detail-view-label">Inner · Right</p>
              </div>
            </div>
            <div className="hand-detail-row">
              <div className="hand-detail-panel">
                {renderPanel({ surface: "outer", side: "left" })}
                <p className="hand-detail-view-label">Outer · Left</p>
              </div>
              <div className="hand-detail-panel">
                {renderPanel({ surface: "outer", side: "right" })}
                <p className="hand-detail-view-label">Outer · Right</p>
              </div>
            </div>
          </BodyMapAreaViewLoadingScope>
        ) : null}
      </div>

      {mapsReady ? (
        <BodyMapHeatmapLegend
          variant={variant}
          colorDomain={countColorDomain}
          gradientId={`${uid}-hand-legend-${variant}`}
          className="hand-detail-legend"
          caption={bodyMapDetailLegendCaption({
            variant,
            colorDomain: countColorDomain,
            prefersHover,
            generalScope: "whole-hand (general)",
            leadingNote:
              variant === "countHeatmap"
                ? "Top row: palm side (inner). Bottom row: hand back (outer)."
                : "Top row: inner; bottom row: outer.",
            trailingNote:
              "Unspecified side is split across left and right columns.",
          })}
        />
      ) : null}

      <BodyMapHoverTooltip tooltip={tooltip} />
    </div>
  );
}
