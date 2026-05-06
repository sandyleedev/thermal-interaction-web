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
  | "arm"
  | "wrist"
  | "hand"
  | "leg"
  | "ankle"
  | "foot";

export type FootSubpartId = "general" | "sole" | "toes";

export type ResearchPaper = {
  id: string;
  minC: number;
  maxC: number;
  durationMinS: number;
  durationMaxS: number;
  bodyRegion: BodyRegionId;
  footSubpart: FootSubpartId | null;
  senses: string[];
  purposes: string[];
  materials: string[];
  thermalModes: string[];
  actuationMethods: string[];
};

const BODY_REGIONS: BodyRegionId[] = [
  "head",
  "neck",
  "torso",
  "arm",
  "wrist",
  "hand",
  "leg",
  "ankle",
  "foot",
];

/**
 * Temporary dev-only seeding for density heatmap visual QA.
 * Keep `false` for production-like random distribution.
 */
const USE_HEATMAP_DEMO_CLUSTER_SEED = true;

/**
 * Clustered body-region allocation used only when
 * `USE_HEATMAP_DEMO_CLUSTER_SEED` is enabled.
 * Values are relative weights; schedule is expanded to exact paper count.
 */
const HEATMAP_DEMO_REGION_WEIGHTS: ReadonlyArray<readonly [BodyRegionId, number]> = [
  ["head", 6],
  ["neck", 10],
  ["torso", 22],
  ["arm", 14],
  ["wrist", 8],
  ["hand", 10],
  ["leg", 8],
  ["ankle", 4],
  ["foot", 6],
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

function buildDemoRegionSchedule(total: number): BodyRegionId[] {
  if (total <= 0) return [];
  const schedule: BodyRegionId[] = [];
  const totalWeight = HEATMAP_DEMO_REGION_WEIGHTS.reduce((acc, [, w]) => acc + w, 0);
  if (totalWeight <= 0) return [];

  let assigned = 0;
  for (let i = 0; i < HEATMAP_DEMO_REGION_WEIGHTS.length; i++) {
    const [region, weight] = HEATMAP_DEMO_REGION_WEIGHTS[i];
    let n: number;
    if (i === HEATMAP_DEMO_REGION_WEIGHTS.length - 1) {
      n = Math.max(0, total - assigned);
    } else {
      n = Math.round((total * weight) / totalWeight);
      n = Math.min(n, total - assigned);
    }
    for (let k = 0; k < n; k++) schedule.push(region);
    assigned += n;
  }

  if (schedule.length < total) {
    while (schedule.length < total) schedule.push("torso");
  } else if (schedule.length > total) {
    schedule.length = total;
  }
  return schedule;
}

export function buildResearchPapers(): ResearchPaper[] {
  const demoRegionSchedule = USE_HEATMAP_DEMO_CLUSTER_SEED
    ? buildDemoRegionSchedule(MOCK_PAPER_TEMP_RANGES.length)
    : null;

  return MOCK_PAPER_TEMP_RANGES.map((p, index) => {
    const rnd = mulberry32(index * 0x9e3779b9 + 0x243f6a88);
    const { durationMinS, durationMaxS } = buildDurationRange(rnd);
    const bodyRegion =
      demoRegionSchedule?.[index] ??
      (BODY_REGIONS[Math.floor(rnd() * BODY_REGIONS.length)] ?? "torso");
    const footSubpart: FootSubpartId | null =
      bodyRegion === "foot"
        ? (["general", "sole", "toes"][index % 3] as FootSubpartId)
        : null;

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
      footSubpart,
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
