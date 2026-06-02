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
} from "../shared/bodyMapAreaDotsCache";
import { ArmDetailPanelMap } from "./ArmDetailPanelMap";
import { BodyMapAreaViewLoadingScope } from "../shared/BodyMapAreaViewLoadingScope";
import { BodyMapHoverTooltip } from "../shared/BodyMapHoverTooltip";
import type { BodyMapTooltipState } from "../shared/BodyMapHoverTooltip";
import {
  explicitSideBilateralTooltip,
  simpleBodyMapTooltip,
} from "@/lib/research/bodyMapBilateralTooltips";
import { MAX_HEATMAP_DOTS_PER_REGION } from "../bodyMapSampleDots";
import {
  ARM_LEFT_DETAIL_VIEWBOX,
  ARM_RIGHT_DETAIL_VIEWBOX,
  buildArmAreaDensityDotsByHitId,
  buildArmDotsByHitId,
  type ArmShapeSpec,
} from "./armDetailSampleDots";
import type { BodyMapVariant } from "../bodyMapVariant";
import { BodyMapHeatmapLegend } from "../shared/BodyMapHeatmapLegend";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { BODY_MAP_DETAIL_SELECTION_MODE } from "@/lib/research/bodyMapDetailSelectionMode";
import { normalizeBodyMapSubpart } from "@/lib/research/bodyMapChipSelection";
import {
  ARM_DETAIL_HIT_IDS,
  paperMatchesArmFineSelection,
  paperMatchesArmFineSelectionForSideDots,
  paperMatchesArmFineSelectionForSideAreaView,
  type ArmDetailSide,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

const HEATMAP_DOT_RADIUS = 50;
const HEATMAP_DOT_OPACITY_MIN = 0.22;
const HEATMAP_DOT_OPACITY_MAX = 0.52;
const MAX_HEATMAP_DOTS_PER_HIT = MAX_HEATMAP_DOTS_PER_REGION;

const ARM_RAW_DOTS_DENSITY_BANDWIDTH = 70;
const ARM_RAW_DOTS_DENSITY_CELL_SIZE = 2;
const ARM_RAW_DOTS_DENSITY_THRESHOLDS = 30;

const ARM_SILHOUETTE_STROKE_WIDTH = 4;
const ARM_GENERAL_RING_STROKE_WIDTH = 10;

const ARM_FILL_HIT_IDS = [...ARM_DETAIL_HIT_IDS] as const;

const ARM_COUNT_HIT_IDS = ["general", ...ARM_FILL_HIT_IDS] as const;

const ARM_HIT_LABELS: Record<string, string> = {
  general: "General",
  "upper-arm": "Upper arm",
  forearm: "Forearm",
};

type TooltipState = BodyMapTooltipState;

type ArmPanelParse = {
  silhouetteD: string;
  silhouetteTransform?: string;
  generalOutlineD: string;
  generalOutlineTransform?: string;
  shapeByHit: Map<string, ArmShapeSpec>;
  viewBox: string;
};

function readArmPath(
  doc: Document,
  id: string,
): { d: string; transform?: string } {
  const pathEl = doc.querySelector(`path[id="${id}"]`);
  const d = pathEl?.getAttribute("d")?.trim();
  if (!d) {
    throw new Error(`Arm map SVG: expected path[id="${id}"].`);
  }
  return { d, transform: pathEl?.getAttribute("transform") ?? undefined };
}

/**
 * Left asset: hand–shoulder cut (`Base`) + subparts (`path41` / `path42`).
 * Ignores duplicate helper paths on the full silhouette.
 */
function parseLeftArmDetailSvg(svgText: string): ArmPanelParse {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const base = readArmPath(doc, "Base");

  const shapeByHit = new Map<string, ArmShapeSpec>();
  shapeByHit.set("upper-arm", { kind: "path", ...readArmPath(doc, "path41") });
  shapeByHit.set("forearm", { kind: "path", ...readArmPath(doc, "path42") });

  return {
    silhouetteD: base.d,
    silhouetteTransform: base.transform,
    /** General ring: full hand–shoulder cut (`Base`), same path as silhouette. */
    generalOutlineD: base.d,
    generalOutlineTransform: base.transform,
    shapeByHit,
    viewBox: ARM_LEFT_DETAIL_VIEWBOX,
  };
}

/**
 * Right asset: hand–shoulder cut (`Base`, mirrored from left);
 * subparts `RightUpperArm` / `RightForeArm`.
 */
function parseRightArmDetailSvg(svgText: string): ArmPanelParse {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const base = readArmPath(doc, "Base");

  const shapeByHit = new Map<string, ArmShapeSpec>();
  shapeByHit.set("upper-arm", {
    kind: "path",
    ...readArmPath(doc, "RightUpperArm"),
  });
  shapeByHit.set("forearm", {
    kind: "path",
    ...readArmPath(doc, "RightForeArm"),
  });

  return {
    silhouetteD: base.d,
    silhouetteTransform: base.transform,
    generalOutlineD: base.d,
    generalOutlineTransform: base.transform,
    shapeByHit,
    viewBox: ARM_RIGHT_DETAIL_VIEWBOX,
  };
}

function parseArmSvg(
  svgText: string | null,
  side: ArmDetailSide,
): {
  parse: ArmPanelParse | null;
  error: string | null;
} {
  if (!svgText) {
    return { parse: null, error: null };
  }
  try {
    const parse =
      side === "left"
        ? parseLeftArmDetailSvg(svgText)
        : parseRightArmDetailSvg(svgText);
    return { parse, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { parse: null, error: msg };
  }
}

function countsForSide(
  papers: readonly ResearchPaper[],
  panelSide: ArmDetailSide,
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const k of ARM_COUNT_HIT_IDS) {
    m[k] = papers.filter((p) =>
      paperMatchesArmFineSelectionForSideDots(p, k, panelSide),
    ).length;
  }
  return m;
}

function countsForSideAreaView(
  papers: readonly ResearchPaper[],
  panelSide: ArmDetailSide,
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const k of ARM_COUNT_HIT_IDS) {
    m[k] = papers.filter((p) =>
      paperMatchesArmFineSelectionForSideAreaView(p, k, panelSide),
    ).length;
  }
  return m;
}

export type ArmBodyMapDetailProps = {
  variant: BodyMapVariant;
  papers: readonly ResearchPaper[];
};

export function ArmBodyMapDetail({ variant, papers }: ArmBodyMapDetailProps) {
  const { toggleBodyMapChip, isBodyMapChipSelected, selectedBodyMapChips } =
    useResearchFilter();

  const uid = useId().replace(/:/g, "");
  const leftIdPrefix = `arm-detail-left-${uid}`;
  const rightIdPrefix = `arm-detail-right-${uid}`;

  const [leftSvgText, setLeftSvgText] = useState<string | null>(null);
  const [rightSvgText, setRightSvgText] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [dotsBySide, setDotsBySide] = useState<
    Record<ArmDetailSide, Record<string, { x: number; y: number }[]>>
  >({ left: {}, right: {} });

  const armAreaDotsSampleCacheRef = useRef<
    Map<
      string,
      Record<ArmDetailSide, Record<string, { x: number; y: number }[]>>
    >
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/body-map/arm-left.svg")
      .then((r) => {
        if (!r.ok) throw new Error(`left arm map HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setLeftSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setLeftSvgText("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/body-map/arm-right.svg")
      .then((r) => {
        if (!r.ok) throw new Error(`right arm map HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setRightSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setRightSvgText("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const leftParsed = useMemo(
    () => parseArmSvg(leftSvgText, "left"),
    [leftSvgText],
  );
  const rightParsed = useMemo(
    () => parseArmSvg(rightSvgText, "right"),
    [rightSvgText],
  );

  const parseError = leftParsed.error ?? rightParsed.error;

  const paperIdsKey = useMemo(
    () => papers.map((p) => p.id).join("\0"),
    [papers],
  );

  const countsBySide = useMemo(
    () => ({
      left: countsForSide(papers, "left"),
      right: countsForSide(papers, "right"),
    }),
    [papers, paperIdsKey],
  );

  const countsBySideAreaView = useMemo(
    () => ({
      left: countsForSideAreaView(papers, "left"),
      right: countsForSideAreaView(papers, "right"),
    }),
    [papers, paperIdsKey],
  );

  const displayCountsBySide =
    variant === "rawDots" ? countsBySideAreaView : countsBySide;

  const combinedFillCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const hitId of ARM_FILL_HIT_IDS) {
      if (variant === "rawDots") {
        m[hitId] = Math.max(
          displayCountsBySide.left[hitId] ?? 0,
          displayCountsBySide.right[hitId] ?? 0,
        );
      } else {
        m[hitId] =
          (countsBySide.left[hitId] ?? 0) + (countsBySide.right[hitId] ?? 0);
      }
    }
    return m;
  }, [countsBySide, displayCountsBySide, variant]);

  const countColorDomain = useMemo<[number, number]>(() => {
    const vals = ARM_FILL_HIT_IDS.map((id) => combinedFillCounts[id] ?? 0);
    const maxVal = Math.max(0, ...vals);
    return maxVal <= 0 ? [0, 1] : [0, maxVal];
  }, [combinedFillCounts]);

  const shapeCacheKey = useMemo(() => {
    const leftKeys = leftParsed.parse
      ? [...leftParsed.parse.shapeByHit.keys()].sort().join(",")
      : "";
    const rightKeys = rightParsed.parse
      ? [...rightParsed.parse.shapeByHit.keys()].sort().join(",")
      : "";
    return `${leftKeys}\0${rightKeys}`;
  }, [leftParsed.parse, rightParsed.parse]);

  useLayoutEffect(() => {
    if (
      !leftParsed.parse?.shapeByHit.size ||
      !rightParsed.parse?.shapeByHit.size
    ) {
      return;
    }
    let cancelled = false;
    const areaCacheKey = `${paperIdsKey}\0${shapeCacheKey}`;

    if (variant === "rawDots") {
      const cached = areaDotsLruTouch(
        armAreaDotsSampleCacheRef.current,
        areaCacheKey,
      );
      if (cached) {
        queueMicrotask(() => {
          if (!cancelled) setDotsBySide(structuredClone(cached));
        });
        return () => {
          cancelled = true;
        };
      }
    }

    const next = {
      left:
        variant === "rawDots"
          ? buildArmAreaDensityDotsByHitId(
              papers,
              "left",
              leftParsed.parse!.shapeByHit,
              MAX_HEATMAP_DOTS_PER_HIT,
            )
          : buildArmDotsByHitId(
              papers,
              "left",
              leftParsed.parse!.shapeByHit,
              MAX_HEATMAP_DOTS_PER_HIT,
            ),
      right:
        variant === "rawDots"
          ? buildArmAreaDensityDotsByHitId(
              papers,
              "right",
              rightParsed.parse!.shapeByHit,
              MAX_HEATMAP_DOTS_PER_HIT,
            )
          : buildArmDotsByHitId(
              papers,
              "right",
              rightParsed.parse!.shapeByHit,
              MAX_HEATMAP_DOTS_PER_HIT,
            ),
    };

    if (variant === "rawDots") {
      areaDotsLruPut(
        armAreaDotsSampleCacheRef.current,
        areaCacheKey,
        structuredClone(next),
      );
    }

    queueMicrotask(() => {
      if (!cancelled) setDotsBySide(next);
    });
    return () => {
      cancelled = true;
    };
  }, [
    leftParsed.parse,
    rightParsed.parse,
    paperIdsKey,
    papers,
    shapeCacheKey,
    variant,
  ]);

  const clearHover = useCallback(() => {
    setHoveredKey(null);
    setTooltip(null);
  }, []);

  const handleFillHitEnter = useCallback(
    (panelSide: ArmDetailSide) => {
      return (hitId: string) => {
        return (e: PointerEvent<SVGElement>) => {
          setHoveredKey(`${panelSide}:${hitId}`);
          setTooltip(
            hitId === "general"
              ? simpleBodyMapTooltip(
                  ARM_HIT_LABELS.general,
                  countsBySide[panelSide].general ?? 0,
                  e.clientX,
                  e.clientY,
                )
              : explicitSideBilateralTooltip(
                  papers,
                  ARM_HIT_LABELS[hitId] ?? hitId,
                  "arm",
                  hitId,
                  panelSide,
                  (p) => paperMatchesArmFineSelection(p, hitId),
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
    (panelSide: ArmDetailSide) => {
      return (hitId: string) => {
        toggleBodyMapChip("arm", hitId, panelSide);
      };
    },
    [toggleBodyMapChip],
  );

  const isHitSelected = useCallback(
    (panelSide: ArmDetailSide) => {
      return (hitId: string) => isBodyMapChipSelected("arm", hitId, panelSide);
    },
    [isBodyMapChipSelected],
  );

  const generalRingHovered =
    hoveredKey === "left:general" || hoveredKey === "right:general";

  const suppressSelectedFineFillWhileGeneralHover =
    generalRingHovered &&
    selectedBodyMapChips.some(
      (c) =>
        c.parent === "arm" &&
        normalizeBodyMapSubpart(c.subpart) !== "" &&
        normalizeBodyMapSubpart(c.subpart) !== "general",
    );

  const handleGeneralRingEnter = useCallback(
    (panelSide: ArmDetailSide) => {
      return (e: PointerEvent<SVGElement>) => {
        setHoveredKey(`${panelSide}:general`);
        setTooltip(
          simpleBodyMapTooltip(
            ARM_HIT_LABELS.general,
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
    leftParsed.parse &&
    rightParsed.parse &&
    !parseError &&
    leftSvgText !== null &&
    rightSvgText !== null &&
    leftSvgText !== "" &&
    rightSvgText !== "";

  const panelCommon = {
    variant,
    fillHitIds: ARM_FILL_HIT_IDS,
    heatmapDotRadius: HEATMAP_DOT_RADIUS,
    heatmapDotOpacityMin: HEATMAP_DOT_OPACITY_MIN,
    heatmapDotOpacityMax: HEATMAP_DOT_OPACITY_MAX,
    silhouetteStrokeWidth: ARM_SILHOUETTE_STROKE_WIDTH,
    generalRingStrokeWidth: ARM_GENERAL_RING_STROKE_WIDTH,
    rawDotsDensityBandwidth: ARM_RAW_DOTS_DENSITY_BANDWIDTH,
    rawDotsDensityCellSize: ARM_RAW_DOTS_DENSITY_CELL_SIZE,
    rawDotsDensityThresholds: ARM_RAW_DOTS_DENSITY_THRESHOLDS,
    countColorDomain,
    suppressSelectedFineFillWhileGeneralHover,
    onPointerMove: handleMove,
    onPointerLeave: clearHover,
    generalRingHovered,
  };

  const renderPanel = (
    panelSide: ArmDetailSide,
    parsed: ArmPanelParse,
    idPrefix: string,
    sideLabel: string,
  ) => {
    const hoveredHitId = (() => {
      if (!hoveredKey) return null;
      const [hoverSide, hoverHit] = hoveredKey.split(":");
      if (!hoverHit) return null;
      if (BODY_MAP_DETAIL_SELECTION_MODE === "merged") return hoverHit;
      return hoverSide === panelSide ? hoverHit : null;
    })();
    const panelGeneralActive =
      hoveredHitId === "general" ||
      isBodyMapChipSelected("arm", "general", panelSide);
    return (
      <ArmDetailPanelMap
        sideLabel={sideLabel}
        viewBox={parsed.viewBox}
        svgClassName="body-map-svg arm-detail-svg"
        ariaLabel={`${sideLabel} arm: upper arm, forearm, and general outline`}
        idPrefix={idPrefix}
        silhouetteD={parsed.silhouetteD}
        silhouetteTransform={parsed.silhouetteTransform}
        generalOutlineD={parsed.generalOutlineD}
        generalOutlineTransform={parsed.generalOutlineTransform}
        shapeByHit={parsed.shapeByHit}
        dotsByHitId={dotsBySide[panelSide]}
        countsByHit={displayCountsBySide[panelSide]}
        hoveredHitId={hoveredHitId}
        isHitSelected={isHitSelected(panelSide)}
        onToggleHit={toggleHit(panelSide)}
        onFillHitEnter={handleFillHitEnter(panelSide)}
        onGeneralRingEnter={handleGeneralRingEnter(panelSide)}
        onGeneralRingClick={() =>
          toggleBodyMapChip("arm", "general", panelSide)
        }
        generalRingActive={panelGeneralActive}
        {...panelCommon}
      />
    );
  };

  return (
    <div className="body-map-root arm-detail-root">
      <div className="body-map-svg-wrap arm-detail-svg-wrap">
        {parseError ? (
          <p className="arm-detail-error" role="alert">
            {parseError}
          </p>
        ) : null}
        {leftSvgText === null || rightSvgText === null ? (
          <p className="arm-detail-loading">Loading arm maps…</p>
        ) : null}
        {leftSvgText === "" || rightSvgText === "" ? (
          <p className="arm-detail-error" role="alert">
            Could not load arm map SVG.
          </p>
        ) : null}
        {mapsReady ? (
          <BodyMapAreaViewLoadingScope className="arm-detail-stage">
            <div className="arm-detail-side-panel">
              {renderPanel("left", leftParsed.parse!, leftIdPrefix, "Left")}
              <p className="arm-detail-view-label">Left</p>
            </div>
            <div className="arm-detail-side-panel">
              {renderPanel("right", rightParsed.parse!, rightIdPrefix, "Right")}
              <p className="arm-detail-view-label">Right</p>
            </div>
          </BodyMapAreaViewLoadingScope>
        ) : null}
      </div>

      {mapsReady ? (
        <BodyMapHeatmapLegend
          variant={variant}
          colorDomain={countColorDomain}
          gradientId={`${uid}-arm-legend-${variant}`}
          className="torso-detail-legend"
          caption={
            variant === "countHeatmap"
              ? `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Hover subregions or the outline for whole-arm (general). Unspecified side is split across left and right panels.`
              : `Paper count (low to high): ${countColorDomain[0].toLocaleString()} to ${countColorDomain[1].toLocaleString()}. Uses the same d3 density smoothing as the full-body map. Hover the outline for whole-arm (general). Unspecified side is split across left and right panels.`
          }
        />
      ) : null}

      <BodyMapHoverTooltip tooltip={tooltip} />
    </div>
  );
}
