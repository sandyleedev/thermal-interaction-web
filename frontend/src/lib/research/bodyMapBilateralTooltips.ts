import type { BodyMapTooltipState } from "@/components/body-map/shared/BodyMapHoverTooltip";
import type { BodyMapParentRegion } from "@/lib/research/bodyMapRegions";
import {
  buildBilateralHoverTooltipLines,
  countPapersWithExplicitSideForParent,
  countPapersWithExplicitSideForSite,
  type BodyMapHoverTooltipLine,
} from "@/lib/research/bodyMapSiteSide";
import {
  countPapersWithBodySubregion,
  paperMatchesArmFineSelection,
  paperMatchesFootFineSelection,
  paperMatchesHandFineSelection,
  paperMatchesLegFineSelection,
  type ArmDetailSide,
  type FootDetailSide,
  type HandDetailPanel,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

function countMatching(
  papers: readonly ResearchPaper[],
  pred: (paper: ResearchPaper) => boolean,
): number {
  let n = 0;
  for (const p of papers) {
    if (pred(p)) n += 1;
  }
  return n;
}

function tooltipAt(
  lines: BodyMapHoverTooltipLine[],
  x: number,
  y: number,
): BodyMapTooltipState {
  return { lines, x, y };
}

function bilateralLines(
  totalLabel: string,
  papers: readonly ResearchPaper[],
  totalMatch: (paper: ResearchPaper) => boolean,
  parent: "arm" | "hand" | "foot" | "leg" | "head",
  subregion: string,
  side: "left" | "right" | null,
): BodyMapHoverTooltipLine[] {
  const totalCount = countMatching(papers, totalMatch);
  const sideCount =
    side == null
      ? 0
      : countPapersWithExplicitSideForSite(papers, parent, subregion, side);
  return buildBilateralHoverTooltipLines(
    totalLabel,
    totalCount,
    side,
    totalLabel,
    sideCount,
  );
}

export function armBilateralTooltip(
  papers: readonly ResearchPaper[],
  hitId: string,
  panelSide: ArmDetailSide,
  displayLabel: string,
  x: number,
  y: number,
): BodyMapTooltipState {
  const label = displayLabel.toLowerCase();
  return tooltipAt(
    bilateralLines(
      label,
      papers,
      (p) => paperMatchesArmFineSelection(p, hitId),
      "arm",
      hitId,
      panelSide,
    ),
    x,
    y,
  );
}

export function handBilateralTooltip(
  papers: readonly ResearchPaper[],
  hitId: string,
  panel: HandDetailPanel,
  displayLabel: string,
  x: number,
  y: number,
): BodyMapTooltipState {
  const label = displayLabel.toLowerCase();
  return tooltipAt(
    bilateralLines(
      label,
      papers,
      (p) => paperMatchesHandFineSelection(p, hitId),
      "hand",
      hitId,
      panel.side,
    ),
    x,
    y,
  );
}

export function footBilateralTooltip(
  papers: readonly ResearchPaper[],
  hitId: string,
  panelSide: FootDetailSide,
  displayLabel: string,
  x: number,
  y: number,
): BodyMapTooltipState {
  const label = displayLabel.toLowerCase();
  return tooltipAt(
    bilateralLines(
      label,
      papers,
      (p) => paperMatchesFootFineSelection(p, hitId),
      "foot",
      hitId,
      panelSide,
    ),
    x,
    y,
  );
}

const LEG_HIT_META: Record<
  string,
  { subregion: string; side: "left" | "right"; totalHit: string; label: string }
> = {
  "left-thigh": {
    subregion: "thigh",
    side: "left",
    totalHit: "thigh",
    label: "thigh",
  },
  "right-thigh": {
    subregion: "thigh",
    side: "right",
    totalHit: "thigh",
    label: "thigh",
  },
  "left-crural-region": {
    subregion: "crural-region",
    side: "left",
    totalHit: "crural-region",
    label: "crural region",
  },
  "right-crural-region": {
    subregion: "crural-region",
    side: "right",
    totalHit: "crural-region",
    label: "crural region",
  },
};

export function legBilateralTooltip(
  papers: readonly ResearchPaper[],
  hitId: string,
  x: number,
  y: number,
): BodyMapTooltipState | null {
  const meta = LEG_HIT_META[hitId];
  if (!meta) return null;
  return tooltipAt(
    bilateralLines(
      meta.label,
      papers,
      (p) => paperMatchesLegFineSelection(p, meta.totalHit),
      "leg",
      meta.subregion,
      meta.side,
    ),
    x,
    y,
  );
}

const HEAD_LATERAL_HIT_META: Record<
  string,
  { subregion: string; side: "left" | "right"; label: string }
> = {
  "left-ear": {
    subregion: "ear",
    side: "left",
    label: "ear",
  },
  "right-ear": {
    subregion: "ear",
    side: "right",
    label: "ear",
  },
  "left-cheek": {
    subregion: "cheek",
    side: "left",
    label: "cheek",
  },
  "right-cheek": {
    subregion: "cheek",
    side: "right",
    label: "cheek",
  },
};

export function headBilateralTooltip(
  papers: readonly ResearchPaper[],
  hitId: string,
  x: number,
  y: number,
): BodyMapTooltipState | null {
  const meta = HEAD_LATERAL_HIT_META[hitId];
  if (!meta) return null;
  const totalCount = countPapersWithBodySubregion(
    papers,
    "head",
    meta.subregion,
  );
  const sideCount = countPapersWithExplicitSideForSite(
    papers,
    "head",
    meta.subregion,
    meta.side,
  );
  return tooltipAt(
    buildBilateralHoverTooltipLines(
      meta.label,
      totalCount,
      meta.side,
      meta.label,
      sideCount,
    ),
    x,
    y,
  );
}

export function simpleBodyMapTooltip(
  label: string,
  count: number,
  x: number,
  y: number,
): BodyMapTooltipState {
  return {
    lines: [{ label, count }],
    x,
    y,
  };
}

/** L1 parts with bilateral SVG subpaths but no zoomed detail map (wrist, ankle). */
const L1_BILATERAL_PARTS_WITHOUT_DETAIL = new Set<BodyMapParentRegion>([
  "wrist",
  "ankle",
]);

export function isL1BilateralPartWithoutDetail(
  parent: BodyMapParentRegion,
): parent is "wrist" | "ankle" {
  return L1_BILATERAL_PARTS_WITHOUT_DETAIL.has(parent);
}

export function l1BilateralPartTooltip(
  papers: readonly ResearchPaper[],
  parent: "wrist" | "ankle",
  displayLabel: string,
  totalCount: number,
  hoverSide: "left" | "right" | null,
  x: number,
  y: number,
): BodyMapTooltipState {
  const label = displayLabel.toLowerCase();
  const sideCount =
    hoverSide == null
      ? 0
      : countPapersWithExplicitSideForParent(papers, parent, hoverSide);
  return tooltipAt(
    buildBilateralHoverTooltipLines(
      label,
      totalCount,
      hoverSide,
      label,
      sideCount,
    ),
    x,
    y,
  );
}
