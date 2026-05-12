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
} from "@/lib/research/bodyMapRegionUtils";

export {
  BODY_MAP_L2_SUBREGIONS_BY_PARENT,
  BODY_MAP_PARENT_REGIONS,
  BODY_MAP_REGIONS,
  bodyMapParentKeysForPaper,
  bodyMapPlacementRegionsForDetail,
  countPapersWithWholeBodyGeneral,
  parentKeysForBodyMapAggregatedCounts,
  paperHasWholeBodyGeneralSite,
  paperMatchesBodyMapFineSelection,
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
  minC: number;
  maxC: number;
  durationMinS: number;
  durationMaxS: number;
  bodySites: BodySite[];
  senses: string[];
  materials: string[];
  thermalModes: string[];
  doi?: string;
  url?: string;
  technicalSummary?: string;
};
export const ALL_RESEARCH_PAPERS: ResearchPaper[] =
  researchPapersJson as ResearchPaper[];

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
