import {
  OTHER_FILTER_CATEGORY_ORDER,
  type OtherFilterCategory,
  OTHER_FILTER_OPTIONS,
} from "@/lib/research/otherFilterVocab";
import type { BodySiteSide } from "@/lib/research/bodyMapSiteSide";
import researchPapersJson from "@/data/researchPapers.json";

export type {
  BodyMapDetailRegion,
  BodyMapParentRegion,
  BodyMapPlacementRegion,
  BodyMapRegion,
  ArmDetailHitId,
  ArmDetailSide,
  FootDetailHitId,
  FootDetailSide,
  LegDetailHitId,
  LegDetailSide,
  HandDetailHitId,
  HandDetailPanel,
  HandDetailSide,
  HandDetailSurface,
  HeadDetailHitId,
  NeckDetailHitId,
  TorsoDetailHitId,
} from "@/lib/research/bodyMapRegionUtils";

export {
  BODY_MAP_L2_SUBREGIONS_BY_PARENT,
  BODY_MAP_PARENT_REGIONS,
  BODY_MAP_PLACEMENT_REGIONS,
  BODY_MAP_REGIONS,
  bodyMapParentKeysForPaper,
  bodyMapPlacementRegionsForDetail,
  bodyMapRegionForPlacement,
  countPapersWithBodySubregion,
  countPapersWithWholeBodyGeneral,
  ARM_DETAIL_HIT_IDS,
  armSiteMatchesPanelSide,
  FOOT_DETAIL_HIT_IDS,
  footSiteMatchesPanelSide,
  LEG_DETAIL_HIT_IDS,
  legSiteMatchesPanelSide,
  HAND_DETAIL_HIT_IDS,
  HAND_INNER_DETAIL_HIT_IDS,
  HAND_OUTER_DETAIL_HIT_IDS,
  handSiteMatchesPanelSide,
  HEAD_DETAIL_HIT_IDS,
  NECK_DETAIL_HIT_IDS,
  TORSO_DETAIL_HIT_IDS,
  paperMatchesArmFineSelection,
  paperMatchesArmFineSelectionForSide,
  paperMatchesArmFineSelectionForSideDots,
  paperMatchesArmFineSelectionForSideAreaView,
  paperMatchesFootFineSelection,
  paperMatchesFootFineSelectionForSide,
  paperMatchesFootFineSelectionForSideDots,
  paperMatchesFootFineSelectionForSideAreaView,
  paperMatchesLegFineSelection,
  paperMatchesLegFineSelectionForSide,
  paperMatchesLegFineSelectionForSideDots,
  paperMatchesLegFineSelectionForSideAreaView,
  paperMatchesHandFineSelection,
  paperMatchesHandFineSelectionForPanel,
  paperMatchesHandFineSelectionForPanelDots,
  paperMatchesHandFineSelectionForPanelAreaView,
  paperMatchesHandFineSelectionForSideDots,
  paperMatchesHandFineSelectionForSideAreaView,
  parentKeysForBodyMapAggregatedCounts,
  paperHasWholeBodyGeneralSite,
  paperMatchesBodyMapFineSelection,
  paperMatchesHeadFineSelection,
  paperMatchesHeadFineSelectionForSideDots,
  paperMatchesHeadFineSelectionForSideAreaView,
  paperMatchesNeckFineSelection,
  paperMatchesTorsoFineSelection,
  paperTouchesBodyMapParent,
  resolveBodySite,
  WHOLE_BODY_GENERAL_COUNT_KEY,
} from "@/lib/research/bodyMapRegionUtils";

export type { BodySiteSide } from "@/lib/research/bodyMapSiteSide";

/**
 * One measured / stimulated location on the body.
 * - `region` should be an L1 parent (`head`, `arm`, …) or `whole-body`.
 * - `subregion` is the L2 slug (`forearm`, `palm`, …); use `general` when unknown.
 * - `side` is `left`, `right`, or `null` when laterality is unknown.
 */
export type BodySite = {
  region: string;
  subregion: string;
  side?: BodySiteSide;
};

export type ResearchPaper = {
  id: string;
  title: string;
  authors?: string;
  publicationYear?: number;
  /** ISO date (YYYY-MM-DD) for sorting by publication date. */
  publicationSortDate?: string;
  publicationVenue?: string;
  doi?: string;
  url?: string;
  abstract?: string | null;
  temperatureNotes?: string | null;

  ambientTempC?: number | null;
  minTempC: number | null;
  maxTempC: number | null;
  durationNotes?: string | null;
  minDurationSec: number | null;
  maxDurationSec: number | null;
  senses: string[];
  thermalPerceptionMeasure?: string | null;
  thermalCuePurpose?: string | null;
  thermalTransferModes: string[];

  /** Technical related fields */
  mainActuatorForTemperatureSensation?: string | null;
  mainActuatorModel?: string | null;
  mainActuatorSize?: string | null;
  overallDeviceSize?: string | null;
  mainActuatorPossibleTemperatureRange?: string | null;
  otherSensoryActuators?: string[];
  auxiliaryHardware?: string[];
  heatControlMethod?: string | null;
  powerConsumption?: string | null;
  temporalParameters?: string | null;
  otherNote?: string | null;

  materialsInContactWithSkin: string[];

  bodyPartsInvolved?: string | null;
  bodySites: BodySite[];

  powerEnergyConsumption?: string | null;
};

const THERMAL_ALONE_SENSE = "thermal-alone";

/** thermal-alone is only valid when thermal is the sole reported sense. */
export function normalizeSenses(senses: readonly string[]): string[] {
  const list = [...senses];
  if (list.includes(THERMAL_ALONE_SENSE) && list.length > 1) {
    return list.filter((s) => s !== THERMAL_ALONE_SENSE);
  }
  return list;
}

export const ALL_RESEARCH_PAPERS: ResearchPaper[] = (
  researchPapersJson as ResearchPaper[]
).map((p) => ({
  ...p,
  senses: normalizeSenses(p.senses ?? []),
}));

export function getResearchPaperById(id: string): ResearchPaper | undefined {
  return ALL_RESEARCH_PAPERS.find((p) => p.id === id);
}

const PUBLICATION_SORT_DATE_FALLBACK = "0000-01-01";

export function publicationSortDateKey(paper: ResearchPaper): string {
  const date = paper.publicationSortDate?.trim();
  return date || PUBLICATION_SORT_DATE_FALLBACK;
}

/** Newest publication first. */
export function comparePapersByPublicationDateDesc(
  a: ResearchPaper,
  b: ResearchPaper,
): number {
  return publicationSortDateKey(b).localeCompare(publicationSortDateKey(a));
}

export function sortPapersByPublicationDateDesc(
  papers: readonly ResearchPaper[],
): ResearchPaper[] {
  return [...papers].sort(comparePapersByPublicationDateDesc);
}

export function normalizeBodySites(paper: ResearchPaper): BodySite[] {
  return (paper.bodySites ?? []).map((site) => ({
    ...site,
    side: site.side ?? null,
  }));
}

export function paperFieldForCategory(
  paper: ResearchPaper,
  cat: OtherFilterCategory,
): string[] {
  switch (cat) {
    case "senses":
      return paper.senses;
    case "materialsInContactWithSkin":
      return paper.materialsInContactWithSkin;
    case "thermalTransferModes":
      return paper.thermalTransferModes;
    default:
      return [];
  }
}

/** Option ids per category (for validation / iteration). */
export const OPTION_IDS_BY_CATEGORY: Record<OtherFilterCategory, string[]> =
  Object.fromEntries(
    OTHER_FILTER_CATEGORY_ORDER.map((c) => [
      c,
      OTHER_FILTER_OPTIONS[c].map((o) => o.id),
    ]),
  ) as Record<OtherFilterCategory, string[]>;
