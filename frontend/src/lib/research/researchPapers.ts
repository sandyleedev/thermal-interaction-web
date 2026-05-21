import {
  OTHER_FILTER_CATEGORY_ORDER,
  type OtherFilterCategory,
  OTHER_FILTER_OPTIONS,
} from "@/lib/research/otherFilterVocab";
import researchPapersJson from "@/data/researchPapers.json";

export type {
  BodyMapDetailRegion,
  BodyMapParentRegion,
  BodyMapPlacementRegion,
  BodyMapRegion,
  HeadDetailHitId,
  NeckDetailHitId,
} from "@/lib/research/bodyMapRegionUtils";

export {
  BODY_MAP_L2_SUBREGIONS_BY_PARENT,
  BODY_MAP_PARENT_REGIONS,
  BODY_MAP_PLACEMENT_REGIONS,
  BODY_MAP_REGIONS,
  bodyMapParentKeysForPaper,
  bodyMapPlacementRegionsForDetail,
  bodyMapRegionForPlacement,
  countPapersWithWholeBodyGeneral,
  HEAD_DETAIL_HIT_IDS,
  NECK_DETAIL_HIT_IDS,
  parentKeysForBodyMapAggregatedCounts,
  paperHasWholeBodyGeneralSite,
  paperMatchesBodyMapFineSelection,
  paperMatchesHeadFineSelection,
  paperMatchesNeckFineSelection,
  paperTouchesBodyMapParent,
  resolveBodySite,
  WHOLE_BODY_GENERAL_COUNT_KEY,
} from "@/lib/research/bodyMapRegionUtils";

export type BodySiteSide = "left" | "right" | "unspecified";

/**
 * One measured / stimulated location on the body.
 * - `region` should be an L1 parent (`head`, `arm`, …) or `wholeBody`.
 * - `subregion` is the L2 slug (`forearm`, `palm`, …); use `general` when unknown.
 * - `side` is optional anatomical left/right when the paper reports it.
 */
export type BodySite = {
  region: string;
  subregion: string;
  side?: BodySiteSide;
};

export type ResearchPaper = {
  id: string;
  title?: string;
  authors?: string;
  publicationYear?: number;
  publicationVenue?: string;
  /**
   * Reported stimulus / study temperature bounds (°C), or `null` when not reported or not applicable.
   * Use `null` for both when the paper does not give a numeric range (do not invent placeholders).
   */
  minC: number | null;
  maxC: number | null;
  /**
   * Stimulus or study block duration bounds (seconds), or `null` when not reported or not applicable.
   */
  durationMinS: number | null;
  durationMaxS: number | null;
  bodySites: BodySite[];
  senses: string[];
  materials: string[];
  thermalModes: string[];
  doi?: string;
  url?: string;
  technicalSummary?: string;
  /** Rich fields from `researchPapers.json` (detail page). */
  materialsInContactWithSkin?: string[];
  ambientTemperatureC?: number | null;
  thermalVocabularyDescription?: string;
  emotionTheoriesMentioned?: string[];
  emotionTheoriesUsage?: string;
  emotionAffectMeasurement?: string;
  thermalAffectJustification?: string;
  thermalCuePurpose?: string;
  mainActuatorForTemperatureSensation?: string;
  mainActuatorModel?: string;
  mainActuatorSize?: string;
  overallDeviceSize?: string;
  mainActuatorPossibleTemperatureRange?: string;
  otherSensoryActuators?: string[];
  auxiliaryHardware?: string[];
  heatControlMethod?: string;
  powerConsumption?: string;
  temporalParameters?: string;
  otherNote?: string;
  studyMethods?: string;
  contributions?: string;
  contributionsToDesign?: string;
  powerEnergyConsumption?: string;
};
export const ALL_RESEARCH_PAPERS: ResearchPaper[] =
  researchPapersJson as ResearchPaper[];

export function getResearchPaperById(id: string): ResearchPaper | undefined {
  return ALL_RESEARCH_PAPERS.find((p) => p.id === id);
}

export function normalizeBodySites(paper: ResearchPaper): BodySite[] {
  return paper.bodySites ?? [];
}

export function paperFieldForCategory(
  paper: ResearchPaper,
  cat: OtherFilterCategory,
): string[] {
  switch (cat) {
    case "senses":
      return paper.senses;
    case "materials":
      return paper.materials;
    case "thermalModes":
      return paper.thermalModes;
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
