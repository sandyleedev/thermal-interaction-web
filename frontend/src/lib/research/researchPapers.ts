import { MOCK_PAPER_TEMP_RANGES } from "@/components/temperature-panel/temperaturePanelMockData";
import {
  OTHER_FILTER_CATEGORY_ORDER,
  OTHER_FILTER_OPTIONS,
  type OtherFilterCategory,
} from "@/lib/research/otherFilterVocab";

/** Primary body region for aggregation on the body map (merged limbs). */
export type BodyRegionId =
  | "head"
  | "neck"
  | "torso"
  | "arms"
  | "legs"
  | "hands"
  | "feet";

export type ResearchPaper = {
  id: string;
  minC: number;
  maxC: number;
  durationMinS: number;
  durationMaxS: number;
  bodyRegion: BodyRegionId;
  senses: string[];
  purposes: string[];
  materials: string[];
  thermalModes: string[];
  actuationMethods: string[];
};

const BODY_REGIONS: BodyRegionId[] = [
  "head",
  "torso",
  "arms",
  "legs",
  "hands",
  "feet",
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickUniqueIds(
  pool: string[],
  rnd: () => number,
  minPick: number,
  maxPick: number,
): string[] {
  const n = Math.min(
    pool.length,
    minPick + Math.floor(rnd() * (maxPick - minPick + 1)),
  );
  const idx = [...pool.keys()].sort(() => rnd() - 0.5);
  return idx.slice(0, n).map((i) => pool[i]);
}

function buildDurationRange(rnd: () => number): {
  durationMinS: number;
  durationMaxS: number;
} {
  const LOG_MIN = Math.log10(1);
  const LOG_MAX = Math.log10(7 * 24 * 3600);
  const centerLog = LOG_MIN + rnd() * (LOG_MAX - LOG_MIN);
  let center = Math.pow(10, centerLog);
  const spread = center * (0.15 + rnd() * 2.5);
  let minS = Math.max(1, center - spread * rnd());
  let maxS = Math.min(7 * 24 * 3600, center + spread * (0.5 + rnd()));
  if (minS > maxS) [minS, maxS] = [maxS, minS];
  if (maxS - minS < 1) maxS = Math.min(7 * 24 * 3600, minS + 1);
  return { durationMinS: minS, durationMaxS: maxS };
}

function paperTagsForCategory(
  cat: OtherFilterCategory,
  rnd: () => number,
): string[] {
  const ids = OTHER_FILTER_OPTIONS[cat].map((o) => o.id);
  const weights =
    cat === "actuationMethods"
      ? { min: 1, max: 4 }
      : cat === "purposes"
        ? { min: 1, max: 3 }
        : { min: 1, max: 3 };
  return pickUniqueIds(ids, rnd, weights.min, weights.max);
}

export function buildResearchPapers(): ResearchPaper[] {
  return MOCK_PAPER_TEMP_RANGES.map((p, index) => {
    const rnd = mulberry32(index * 0x9e3779b9 + 0x243f6a88);
    const { durationMinS, durationMaxS } = buildDurationRange(rnd);
    const forcedNeck = index === 0 || index === 1;
    const bodyRegion = forcedNeck
      ? "neck"
      : (BODY_REGIONS[Math.floor(rnd() * BODY_REGIONS.length)] ?? "torso");

    const senses = paperTagsForCategory("senses", rnd);
    const purposes = paperTagsForCategory("purposes", rnd);
    const materials = paperTagsForCategory("materials", rnd);
    const thermalModes = paperTagsForCategory("thermalModes", rnd);
    const actuationMethods = paperTagsForCategory("actuationMethods", rnd);

    return {
      id: p.id,
      minC: p.minC,
      maxC: p.maxC,
      durationMinS,
      durationMaxS,
      bodyRegion,
      senses,
      purposes,
      materials,
      thermalModes,
      actuationMethods,
    };
  });
}

export const ALL_RESEARCH_PAPERS: ResearchPaper[] = buildResearchPapers();

export function paperFieldForCategory(
  paper: ResearchPaper,
  cat: OtherFilterCategory,
): string[] {
  switch (cat) {
    case "senses":
      return paper.senses;
    case "purposes":
      return paper.purposes;
    case "materials":
      return paper.materials;
    case "thermalModes":
      return paper.thermalModes;
    case "actuationMethods":
      return paper.actuationMethods;
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
