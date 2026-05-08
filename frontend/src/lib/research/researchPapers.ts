import {
  OTHER_FILTER_CATEGORY_ORDER,
  type OtherFilterCategory,
  OTHER_FILTER_OPTIONS,
} from "@/lib/research/otherFilterVocab";
import researchPapersJson from "@/data/researchPapers.json";

/** Primary body region for aggregation on the body map (merged limbs). */
export type BodyRegionId =
  | "head"
  | "neck"
  | "torso"
  | "arm"
  | "wrist"
  | "hand"
  | "leg"
  | "ankle";

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
  mainBodyPart: BodyRegionId;
  senses: string[];
  materials: string[];
  thermalModes: string[];
  doi?: string;
  url?: string;
  technicalSummary?: string;
};
export const ALL_RESEARCH_PAPERS: ResearchPaper[] =
  researchPapersJson as ResearchPaper[];

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
