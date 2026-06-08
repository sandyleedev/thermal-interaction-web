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
import type { BodySiteSide } from "@/lib/research/bodyMapSiteSide";
import {
  type BodyMapChipSelection,
  bodyMapChipKey,
  getSelectableChipsForParent,
} from "@/lib/research/bodyMapChipSelection";
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
  DEFAULT_KEYWORD_SEARCH,
  filterPapersByKeyword,
  hasActiveKeywordSearch,
  type KeywordSearchQuery,
} from "@/lib/research/paperKeywordSearch";
import { canonicalizeDetailSelection } from "@/lib/research/bodyMapDetailSelectionMode";
import {
  TEMP_AXIS_MAX,
  TEMP_AXIS_MIN,
} from "@/components/temperature-panel/temperaturePanelUtils";

function applyKeywordFilter(
  papers: readonly ResearchPaper[],
  keywordSearch: KeywordSearchQuery,
): ResearchPaper[] {
  return filterPapersByKeyword(papers, keywordSearch);
}

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
  /** Papers after temp, duration, other, and body-map filters — keyword excluded. */
  facetFilteredPaperCount: number;
  filteredPaperCount: number;
  keywordSearch: KeywordSearchQuery;
  setKeywordSearch: (search: KeywordSearchQuery) => void;
  hasActiveKeywordSearch: boolean;
  /** Paper counts per merged body region when all filters (including body map) apply. */
  paperCountsByBodyRegion: Record<string, number>;
  /**
   * Papers after temperature, duration, and “other” filters only — body map selection does not apply.
   * Used for body-map dots and per-region counts so map selection stays a visual cue only.
   */
  bodyMapPaperPool: ResearchPaper[];
  /** Per-region counts for the body map (tooltips, heatmap); derived from `bodyMapPaperPool`. */
  bodyMapRegionCounts: Record<string, number>;
  /** Per-option counts: pool excludes that facet’s selections; sibling counts stay stable within a section. */
  optionCounts: ReturnType<typeof otherFilterOptionCounts>;
  /** Body-map chips in selection order (L1 whole region and/or L2 subparts). */
  selectedBodyMapChips: readonly BodyMapChipSelection[];
  /** Detail zoom open on the body map (head / neck / torso); navigation only. */
  activeDetailRegion: BodyMapParentRegion | null;
  toggleBodyMapChip: (
    parent: BodyMapParentRegion,
    subpart?: string | null,
    side?: Extract<BodySiteSide, "left" | "right">,
  ) => void;
  removeBodyMapChip: (
    parent: BodyMapParentRegion,
    subpart?: string | null,
    side?: Extract<BodySiteSide, "left" | "right">,
  ) => void;
  isBodyMapChipSelected: (
    parent: BodyMapParentRegion,
    subpart?: string | null,
    side?: Extract<BodySiteSide, "left" | "right">,
  ) => boolean;
  removeAllBodyMapChipsForParent: (parent: BodyMapParentRegion) => void;
  areAllBodyMapSubpartsSelected: (parent: BodyMapParentRegion) => boolean;
  selectAllBodyMapSubparts: (parent: BodyMapParentRegion) => void;
  clearBodyMapSubpartsForParent: (parent: BodyMapParentRegion) => void;
  navigateToBodyMapDetail: (region: BodyMapParentRegion) => void;
  exitBodyMapDetail: () => void;
  clearBodyMapChips: () => void;
  tempLowC: number;
  tempHighC: number;
  setTempRange: (lowC: number, highC: number) => void;
  clearTemperatureFilter: () => void;
  durationLowS: number;
  durationHighS: number;
  setDurationRange: (lowS: number, highS: number) => void;
  clearDurationFilter: () => void;
  otherSelections: OtherFilterSelections;
  toggleOtherChip: (category: OtherFilterCategory, optionId: string) => void;
  clearOtherFilterCategory: (category: OtherFilterCategory) => void;
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
  const [selectedBodyMapChips, setSelectedBodyMapChips] = useState<
    BodyMapChipSelection[]
  >([]);
  const [activeDetailRegion, setActiveDetailRegion] =
    useState<BodyMapParentRegion | null>(null);
  const [includeUnspecifiedTemperature, setIncludeUnspecifiedTemperature] =
    useState(true);
  const [includeUnspecifiedDuration, setIncludeUnspecifiedDuration] =
    useState(true);
  const [keywordSearch, setKeywordSearch] =
    useState<KeywordSearchQuery>(DEFAULT_KEYWORD_SEARCH);

  const bodyMapSelection: BodyMapSelection = useMemo(
    () => ({
      selectedChips: selectedBodyMapChips,
      activeDetailRegion,
    }),
    [selectedBodyMapChips, activeDetailRegion],
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

  const clearTemperatureFilter = useCallback(() => {
    setTempLowC(DEFAULT_TEMP[0]);
    setTempHighC(DEFAULT_TEMP[1]);
    setIncludeUnspecifiedTemperature(true);
  }, []);

  const clearDurationFilter = useCallback(() => {
    setDurationLowS(DEFAULT_DURATION[0]);
    setDurationHighS(DEFAULT_DURATION[1]);
    setIncludeUnspecifiedDuration(true);
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

  const clearOtherFilterCategory = useCallback((category: OtherFilterCategory) => {
    setOtherSelections((prev) => ({ ...prev, [category]: [] }));
  }, []);

  const clearOtherFilters = useCallback(() => {
    setOtherSelections(emptyOtherFilterSelections());
  }, []);

  const isBodyMapChipSelected = useCallback(
    (
      parent: BodyMapParentRegion,
      subpart?: string | null,
      side?: Extract<BodySiteSide, "left" | "right">,
    ) => {
      const key = bodyMapChipKey(
        canonicalizeDetailSelection(parent, subpart, side),
      );
      return selectedBodyMapChips.some((c) => bodyMapChipKey(c) === key);
    },
    [selectedBodyMapChips],
  );

  const removeBodyMapChip = useCallback(
    (
      parent: BodyMapParentRegion,
      subpart?: string | null,
      side?: Extract<BodySiteSide, "left" | "right">,
    ) => {
      const key = bodyMapChipKey(
        canonicalizeDetailSelection(parent, subpart, side),
      );
      setSelectedBodyMapChips((prev) =>
        prev.filter((c) => bodyMapChipKey(c) !== key),
      );
    },
    [],
  );

  const toggleBodyMapChip = useCallback(
    (
      parent: BodyMapParentRegion,
      subpart?: string | null,
      side?: Extract<BodySiteSide, "left" | "right">,
    ) => {
      const normalizedSelection = canonicalizeDetailSelection(
        parent,
        subpart,
        side,
      );
      const key = bodyMapChipKey(normalizedSelection);
      setSelectedBodyMapChips((prev) => {
        const idx = prev.findIndex((c) => bodyMapChipKey(c) === key);
        if (idx >= 0) {
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        }
        return [...prev, normalizedSelection];
      });
    },
    [],
  );

  const removeAllBodyMapChipsForParent = useCallback(
    (parent: BodyMapParentRegion) => {
      setSelectedBodyMapChips((prev) => prev.filter((c) => c.parent !== parent));
    },
    [],
  );

  const areAllBodyMapSubpartsSelected = useCallback(
    (parent: BodyMapParentRegion) => {
      const chips = getSelectableChipsForParent(parent);
      return chips.every((chip) => {
        const key = bodyMapChipKey(
          canonicalizeDetailSelection(chip.parent, chip.subpart, chip.side),
        );
        return selectedBodyMapChips.some((c) => bodyMapChipKey(c) === key);
      });
    },
    [selectedBodyMapChips],
  );

  const selectAllBodyMapSubparts = useCallback((parent: BodyMapParentRegion) => {
    const chips = getSelectableChipsForParent(parent);
    setSelectedBodyMapChips((prev) => {
      const next = [...prev];
      for (const chip of chips) {
        const normalizedSelection = canonicalizeDetailSelection(
          chip.parent,
          chip.subpart,
          chip.side,
        );
        const key = bodyMapChipKey(normalizedSelection);
        if (!next.some((c) => bodyMapChipKey(c) === key)) {
          next.push(normalizedSelection);
        }
      }
      return next;
    });
  }, []);

  const clearBodyMapSubpartsForParent = useCallback(
    (parent: BodyMapParentRegion) => {
      setSelectedBodyMapChips((prev) => prev.filter((c) => c.parent !== parent));
    },
    [],
  );

  const navigateToBodyMapDetail = useCallback((region: BodyMapParentRegion) => {
    setActiveDetailRegion(region);
  }, []);

  const exitBodyMapDetail = useCallback(() => {
    setActiveDetailRegion(null);
  }, []);

  const clearBodyMapChips = useCallback(() => {
    setSelectedBodyMapChips([]);
  }, []);

  const facetFilteredPapers = useMemo(
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

  const filteredPapers = useMemo(
    () => applyKeywordFilter(facetFilteredPapers, keywordSearch),
    [facetFilteredPapers, keywordSearch],
  );

  const facetTemperatureDensityPapers = useMemo(
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
  const temperatureDensityPapers = useMemo(
    () => applyKeywordFilter(facetTemperatureDensityPapers, keywordSearch),
    [facetTemperatureDensityPapers, keywordSearch],
  );

  const facetDurationDensityPapers = useMemo(
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
  const durationDensityPapers = useMemo(
    () => applyKeywordFilter(facetDurationDensityPapers, keywordSearch),
    [facetDurationDensityPapers, keywordSearch],
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
        keywordSearch,
      ),
    [
      tempLowC,
      tempHighC,
      durationLowS,
      durationHighS,
      otherSelections,
      bodyMapSelection,
      rangeFilterOptions,
      keywordSearch,
    ],
  );

  const paperCountsByBodyRegion = useMemo(
    () => aggregateBodyCounts(filteredPapers),
    [filteredPapers],
  );

  const facetBodyMapPaperPool = useMemo(
    () =>
      filterResearchPapers(
        ALL_RESEARCH_PAPERS,
        tempLowC,
        tempHighC,
        durationLowS,
        durationHighS,
        otherSelections,
        undefined,
        rangeFilterOptions,
      ),
    [
      tempLowC,
      tempHighC,
      durationLowS,
      durationHighS,
      otherSelections,
      rangeFilterOptions,
    ],
  );

  const bodyMapPaperPool = useMemo(
    () => applyKeywordFilter(facetBodyMapPaperPool, keywordSearch),
    [facetBodyMapPaperPool, keywordSearch],
  );

  const bodyMapRegionCounts = useMemo(
    () => aggregateBodyCounts(bodyMapPaperPool),
    [bodyMapPaperPool],
  );

  const value = useMemo(
    (): ResearchFilterContextValue => ({
      totalPaperCount: ALL_RESEARCH_PAPERS.length,
      globalPaperCountsByBodyRegion: GLOBAL_BODY_COUNTS_INITIAL,
      temperatureDensityPapers,
      durationDensityPapers,
      filteredPapers,
      facetFilteredPaperCount: facetFilteredPapers.length,
      filteredPaperCount: filteredPapers.length,
      keywordSearch,
      setKeywordSearch,
      hasActiveKeywordSearch: hasActiveKeywordSearch(keywordSearch),
      paperCountsByBodyRegion,
      bodyMapPaperPool,
      bodyMapRegionCounts,
      optionCounts,
      selectedBodyMapChips,
      activeDetailRegion,
      toggleBodyMapChip,
      removeBodyMapChip,
      isBodyMapChipSelected,
      removeAllBodyMapChipsForParent,
      areAllBodyMapSubpartsSelected,
      selectAllBodyMapSubparts,
      clearBodyMapSubpartsForParent,
      navigateToBodyMapDetail,
      exitBodyMapDetail,
      clearBodyMapChips,
      tempLowC,
      tempHighC,
      setTempRange,
      clearTemperatureFilter,
      durationLowS,
      durationHighS,
      setDurationRange,
      clearDurationFilter,
      otherSelections,
      toggleOtherChip,
      clearOtherFilterCategory,
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
      facetFilteredPapers.length,
      keywordSearch,
      paperCountsByBodyRegion,
      bodyMapPaperPool,
      bodyMapRegionCounts,
      optionCounts,
      selectedBodyMapChips,
      activeDetailRegion,
      toggleBodyMapChip,
      removeBodyMapChip,
      isBodyMapChipSelected,
      removeAllBodyMapChipsForParent,
      areAllBodyMapSubpartsSelected,
      selectAllBodyMapSubparts,
      clearBodyMapSubpartsForParent,
      navigateToBodyMapDetail,
      exitBodyMapDetail,
      clearBodyMapChips,
      tempLowC,
      tempHighC,
      setTempRange,
      clearTemperatureFilter,
      durationLowS,
      durationHighS,
      setDurationRange,
      clearDurationFilter,
      otherSelections,
      toggleOtherChip,
      clearOtherFilterCategory,
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
