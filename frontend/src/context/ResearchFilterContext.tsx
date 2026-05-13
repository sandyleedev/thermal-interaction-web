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
  type BodyMapSelection,
  filterResearchPapers,
  filterResearchPapersIgnoringDuration,
  filterResearchPapersIgnoringTemperature,
  otherFilterOptionCounts,
  type OtherFilterSelections,
  type RangeFilterOptions,
} from "@/lib/research/filterResearchPapers";
import {
  ALL_RESEARCH_PAPERS,
  bodyMapParentKeysForPaper,
  paperHasWholeBodyGeneralSite,
  WHOLE_BODY_GENERAL_COUNT_KEY,
  type BodyMapParentRegion,
  type ResearchPaper,
} from "@/lib/research/researchPapers";
import {
  DURATION_MAX_S,
  DURATION_MIN_S,
} from "@/components/duration-panel/durationPanelUtils";
import {
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
} from "@/components/temperature-panel/temperaturePanelUtils";

type ResearchFilterContextValue = {
  /** Full dataset size from loaded research data. */
  totalPaperCount: number;
  /** Paper counts per region across the entire dataset (fixed heatmap legend / colour domain). */
  globalPaperCountsByBodyRegion: Record<string, number>;
  /** Duration + other filters only; KDE curve uses this so it stays stable when the temperature range moves. */
  temperatureDensityPapers: ResearchPaper[];
  /** Temperature + other filters only; used for duration range coverage labels. */
  durationDensityPapers: ResearchPaper[];
  filteredPapers: ResearchPaper[];
  filteredPaperCount: number;
  /** Paper counts per merged body region for the filtered set. */
  paperCountsByBodyRegion: Record<string, number>;
  /** Per-option counts: pool excludes that facet’s selections; sibling counts stay stable within a section. */
  optionCounts: ReturnType<typeof otherFilterOptionCounts>;
  /** L1 map filter: `BodyMapParentRegion` (merged SVG row or `wholeBody`). */
  selectedBodyRegion: BodyMapParentRegion | null;
  /**
   * L2 filter (subregion slug under `selectedBodyRegion`). Stays null until the zoomed map UI exists.
   * Wired through `bodyMapSelection` so list filters can be extended without another refactor.
   */
  selectedBodyFineSubregion: string | null;
  setBodyMapSelection: (parent: BodyMapParentRegion | null) => void;
  /** Future L2 UI: set fine filter without clearing coarse. */
  setBodyMapFineSubregion: (fineSubregion: string | null) => void;
  clearBodyMapSelection: () => void;
  tempLowC: number;
  tempHighC: number;
  setTempRange: (lowC: number, highC: number) => void;
  durationLowS: number;
  durationHighS: number;
  setDurationRange: (lowS: number, highS: number) => void;
  otherSelections: OtherFilterSelections;
  toggleOtherChip: (category: OtherFilterCategory, optionId: string) => void;
  clearOtherFilters: () => void;
  /** When true, papers without numeric °C bounds still match the temperature slider filter. */
  includeUnspecifiedTemperature: boolean;
  setIncludeUnspecifiedTemperature: (value: boolean) => void;
  /** When true, papers without numeric duration bounds still match the duration slider filter. */
  includeUnspecifiedDuration: boolean;
  setIncludeUnspecifiedDuration: (value: boolean) => void;
};

const ResearchFilterContext = createContext<
  ResearchFilterContextValue | undefined
>(undefined);

/** Full axis span (-10…100 °C), same as the temperature sliders. */
const DEFAULT_TEMP: [number, number] = [TEMP_AXIS_MIN, TEMP_AXIS_MAX];
/** Full log axis span (1 s … 1 week), same as the duration sliders. */
const DEFAULT_DURATION: [number, number] = [DURATION_MIN_S, DURATION_MAX_S];

function aggregateBodyCounts(papers: readonly ResearchPaper[]): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const p of papers) {
    for (const key of bodyMapParentKeysForPaper(p)) {
      raw[key] = (raw[key] ?? 0) + 1;
    }
    if (paperHasWholeBodyGeneralSite(p)) {
      raw[WHOLE_BODY_GENERAL_COUNT_KEY] =
        (raw[WHOLE_BODY_GENERAL_COUNT_KEY] ?? 0) + 1;
    }
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
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<BodyMapParentRegion | null>(
    null,
  );
  const [selectedBodyFineSubregion, setSelectedBodyFineSubregion] = useState<
    string | null
  >(null);
  const [includeUnspecifiedTemperature, setIncludeUnspecifiedTemperature] =
    useState(true);
  const [includeUnspecifiedDuration, setIncludeUnspecifiedDuration] =
    useState(true);

  const bodyMapSelection: BodyMapSelection = useMemo(
    () => ({
      coarseBodyRegion: selectedBodyRegion,
      fineSubregion: selectedBodyFineSubregion,
    }),
    [selectedBodyRegion, selectedBodyFineSubregion],
  );

  const rangeFilterOptions: RangeFilterOptions = useMemo(
    () => ({
      includeUnspecifiedTemperature,
      includeUnspecifiedDuration,
    }),
    [includeUnspecifiedTemperature, includeUnspecifiedDuration],
  );

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

  const setBodyMapSelection = useCallback((parent: BodyMapParentRegion | null) => {
    setSelectedBodyRegion(parent);
    setSelectedBodyFineSubregion(null);
  }, []);

  const setBodyMapFineSubregion = useCallback((fineSubregion: string | null) => {
    setSelectedBodyFineSubregion(fineSubregion);
  }, []);

  const clearBodyMapSelection = useCallback(() => {
    setSelectedBodyRegion(null);
    setSelectedBodyFineSubregion(null);
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
        bodyMapSelection,
        rangeFilterOptions,
      ),
    [
      tempLowC,
      tempHighC,
      durationLowS,
      durationHighS,
      otherSelections,
      bodyMapSelection,
      rangeFilterOptions,
    ],
  );

  const temperatureDensityPapers = useMemo(
    () =>
      filterResearchPapersIgnoringTemperature(
        ALL_RESEARCH_PAPERS,
        durationLowS,
        durationHighS,
        otherSelections,
        bodyMapSelection,
        rangeFilterOptions,
      ),
    [
      durationLowS,
      durationHighS,
      otherSelections,
      bodyMapSelection,
      rangeFilterOptions,
    ],
  );
  const durationDensityPapers = useMemo(
    () =>
      filterResearchPapersIgnoringDuration(
        ALL_RESEARCH_PAPERS,
        tempLowC,
        tempHighC,
        otherSelections,
        bodyMapSelection,
        rangeFilterOptions,
      ),
    [tempLowC, tempHighC, otherSelections, bodyMapSelection, rangeFilterOptions],
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
        bodyMapSelection,
        rangeFilterOptions,
      ),
    [
      tempLowC,
      tempHighC,
      durationLowS,
      durationHighS,
      otherSelections,
      bodyMapSelection,
      rangeFilterOptions,
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
      durationDensityPapers,
      filteredPapers,
      filteredPaperCount: filteredPapers.length,
      paperCountsByBodyRegion,
      optionCounts,
      selectedBodyRegion,
      selectedBodyFineSubregion,
      setBodyMapSelection,
      setBodyMapFineSubregion,
      clearBodyMapSelection,
      tempLowC,
      tempHighC,
      setTempRange,
      durationLowS,
      durationHighS,
      setDurationRange,
      otherSelections,
      toggleOtherChip,
      clearOtherFilters,
      includeUnspecifiedTemperature,
      setIncludeUnspecifiedTemperature,
      includeUnspecifiedDuration,
      setIncludeUnspecifiedDuration,
    }),
    [
      temperatureDensityPapers,
      durationDensityPapers,
      filteredPapers,
      paperCountsByBodyRegion,
      optionCounts,
      selectedBodyRegion,
      selectedBodyFineSubregion,
      setBodyMapSelection,
      setBodyMapFineSubregion,
      clearBodyMapSelection,
      tempLowC,
      tempHighC,
      setTempRange,
      durationLowS,
      durationHighS,
      setDurationRange,
      otherSelections,
      toggleOtherChip,
      clearOtherFilters,
      includeUnspecifiedTemperature,
      includeUnspecifiedDuration,
      setIncludeUnspecifiedTemperature,
      setIncludeUnspecifiedDuration,
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
