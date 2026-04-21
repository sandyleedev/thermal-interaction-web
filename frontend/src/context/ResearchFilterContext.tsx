import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { emptyOtherFilterSelections } from "@/lib/research/otherFilterVocab";
import type { OtherFilterCategory } from "@/lib/research/otherFilterVocab";
import {
  filterResearchPapers,
  filterResearchPapersIgnoringTemperature,
  otherFilterOptionCounts,
  type OtherFilterSelections,
} from "@/lib/research/filterResearchPapers";
import {
  ALL_RESEARCH_PAPERS,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import {
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
} from "@/components/temperature-panel/temperaturePanelUtils";

type ResearchFilterContextValue = {
  /** Full dataset size (constant for mock). */
  totalPaperCount: number;
  /** Paper counts per region across the entire dataset (fixed heatmap legend / colour domain). */
  globalPaperCountsByBodyRegion: Record<string, number>;
  /** Duration + other filters only; KDE curve uses this so it stays stable when the temperature range moves. */
  temperatureDensityPapers: ResearchPaper[];
  filteredPapers: ResearchPaper[];
  filteredPaperCount: number;
  /** Paper counts per merged body region for the filtered set. */
  paperCountsByBodyRegion: Record<string, number>;
  /** Per-option counts: pool excludes that facet’s selections; sibling counts stay stable within a section. */
  optionCounts: ReturnType<typeof otherFilterOptionCounts>;
  tempLowC: number;
  tempHighC: number;
  setTempRange: (lowC: number, highC: number) => void;
  durationLowS: number;
  durationHighS: number;
  setDurationRange: (lowS: number, highS: number) => void;
  otherSelections: OtherFilterSelections;
  toggleOtherChip: (category: OtherFilterCategory, optionId: string) => void;
  clearOtherFilters: () => void;
};

const ResearchFilterContext = createContext<
  ResearchFilterContextValue | undefined
>(undefined);

/** Full axis span (-10…100 °C), same as the temperature sliders. */
const DEFAULT_TEMP: [number, number] = [TEMP_AXIS_MIN, TEMP_AXIS_MAX];
const DEFAULT_DURATION: [number, number] = [10, 3600];

function aggregateBodyCounts(
  papers: readonly ResearchPaper[],
): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const p of papers) {
    raw[p.bodyRegion] = (raw[p.bodyRegion] ?? 0) + 1;
  }
  return raw;
}

const GLOBAL_BODY_COUNTS_INITIAL = aggregateBodyCounts(ALL_RESEARCH_PAPERS);

export function ResearchFilterProvider({ children }: { children: ReactNode }) {
  const [tempLowC, setTempLowC] = useState(DEFAULT_TEMP[0]);
  const [tempHighC, setTempHighC] = useState(DEFAULT_TEMP[1]);
  const [durationLowS, setDurationLowS] = useState(DEFAULT_DURATION[0]);
  const [durationHighS, setDurationHighS] = useState(DEFAULT_DURATION[1]);
  const [otherSelections, setOtherSelections] = useState<
    Record<OtherFilterCategory, string[]>
  >(() => emptyOtherFilterSelections());

  const setTempRange = useCallback((lowC: number, highC: number) => {
    setTempLowC(lowC);
    setTempHighC(highC);
  }, []);

  const setDurationRange = useCallback((lowS: number, highS: number) => {
    setDurationLowS(lowS);
    setDurationHighS(highS);
  }, []);

  const toggleOtherChip = useCallback(
    (category: OtherFilterCategory, optionId: string) => {
      setOtherSelections((prev) => {
        const cur = prev[category];
        const has = cur.includes(optionId);
        const nextList = has
          ? cur.filter((id) => id !== optionId)
          : [...cur, optionId];
        return { ...prev, [category]: nextList };
      });
    },
    [],
  );

  const clearOtherFilters = useCallback(() => {
    setOtherSelections(emptyOtherFilterSelections());
  }, []);

  const filteredPapers = useMemo(
    () =>
      filterResearchPapers(
        ALL_RESEARCH_PAPERS,
        tempLowC,
        tempHighC,
        durationLowS,
        durationHighS,
        otherSelections,
      ),
    [
      tempLowC,
      tempHighC,
      durationLowS,
      durationHighS,
      otherSelections,
    ],
  );

  const temperatureDensityPapers = useMemo(
    () =>
      filterResearchPapersIgnoringTemperature(
        ALL_RESEARCH_PAPERS,
        durationLowS,
        durationHighS,
        otherSelections,
      ),
    [durationLowS, durationHighS, otherSelections],
  );

  const optionCounts = useMemo(
    () =>
      otherFilterOptionCounts(
        ALL_RESEARCH_PAPERS,
        tempLowC,
        tempHighC,
        durationLowS,
        durationHighS,
        otherSelections,
      ),
    [
      tempLowC,
      tempHighC,
      durationLowS,
      durationHighS,
      otherSelections,
    ],
  );

  const paperCountsByBodyRegion = useMemo(
    () => aggregateBodyCounts(filteredPapers),
    [filteredPapers],
  );

  const value = useMemo(
    (): ResearchFilterContextValue => ({
      totalPaperCount: ALL_RESEARCH_PAPERS.length,
      globalPaperCountsByBodyRegion: GLOBAL_BODY_COUNTS_INITIAL,
      temperatureDensityPapers,
      filteredPapers,
      filteredPaperCount: filteredPapers.length,
      paperCountsByBodyRegion,
      optionCounts,
      tempLowC,
      tempHighC,
      setTempRange,
      durationLowS,
      durationHighS,
      setDurationRange,
      otherSelections,
      toggleOtherChip,
      clearOtherFilters,
    }),
    [
      temperatureDensityPapers,
      filteredPapers,
      paperCountsByBodyRegion,
      optionCounts,
      tempLowC,
      tempHighC,
      setTempRange,
      durationLowS,
      durationHighS,
      setDurationRange,
      otherSelections,
      toggleOtherChip,
      clearOtherFilters,
    ],
  );

  return (
    <ResearchFilterContext.Provider value={value}>
      {children}
    </ResearchFilterContext.Provider>
  );
}

export function useResearchFilter(): ResearchFilterContextValue {
  const ctx = useContext(ResearchFilterContext);
  if (!ctx) {
    throw new Error(
      "useResearchFilter must be used within ResearchFilterProvider",
    );
  }
  return ctx;
}
