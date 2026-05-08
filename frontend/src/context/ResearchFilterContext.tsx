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
} from "@/lib/research/filterResearchPapers";
import {
  ALL_RESEARCH_PAPERS,
  type BodyRegionId,
  type FootSubpartId,
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
  /** Temperature + other filters only; used for duration range coverage labels. */
  durationDensityPapers: ResearchPaper[];
  filteredPapers: ResearchPaper[];
  filteredPaperCount: number;
  /** Paper counts per merged body region for the filtered set. */
  paperCountsByBodyRegion: Record<string, number>;
  paperCountsByFootSubpart: Record<FootSubpartId, number>;
  /** Per-option counts: pool excludes that facet’s selections; sibling counts stay stable within a section. */
  optionCounts: ReturnType<typeof otherFilterOptionCounts>;
  selectedBodyRegion: BodyRegionId | null;
  selectedFootSubpart: FootSubpartId | null;
  setBodyMapSelection: (
    bodyRegion: BodyRegionId | null,
    footSubpart?: FootSubpartId | null,
  ) => void;
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
};

const ResearchFilterContext = createContext<
  ResearchFilterContextValue | undefined
>(undefined);

/** Full axis span (-10…100 °C), same as the temperature sliders. */
const DEFAULT_TEMP: [number, number] = [TEMP_AXIS_MIN, TEMP_AXIS_MAX];
const DEFAULT_DURATION: [number, number] = [10, 3600];

function aggregateBodyCounts(papers: readonly ResearchPaper[]): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const p of papers) {
    raw[p.bodyRegion] = (raw[p.bodyRegion] ?? 0) + 1;
  }
  return raw;
}

function aggregateFootSubpartCounts(
  papers: readonly ResearchPaper[],
): Record<FootSubpartId, number> {
  const out: Record<FootSubpartId, number> = { general: 0, sole: 0, toes: 0 };
  for (const p of papers) {
    if (p.bodyRegion !== "foot") continue;
    const sub = p.footSubpart ?? "general";
    out[sub] += 1;
  }
  return out;
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
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<BodyRegionId | null>(
    null,
  );
  const [selectedFootSubpart, setSelectedFootSubpart] =
    useState<FootSubpartId | null>(null);

  const bodyMapSelection: BodyMapSelection = useMemo(
    () => ({
      bodyRegion: selectedBodyRegion,
      footSubpart: selectedBodyRegion === "foot" ? selectedFootSubpart : null,
    }),
    [selectedBodyRegion, selectedFootSubpart],
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

  const setBodyMapSelection = useCallback(
    (bodyRegion: BodyRegionId | null, footSubpart?: FootSubpartId | null) => {
      setSelectedBodyRegion(bodyRegion);
      if (bodyRegion !== "foot") {
        setSelectedFootSubpart(null);
        return;
      }
      setSelectedFootSubpart(footSubpart ?? null);
    },
    [],
  );

  const clearBodyMapSelection = useCallback(() => {
    setSelectedBodyRegion(null);
    setSelectedFootSubpart(null);
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
      ),
    [
      tempLowC,
      tempHighC,
      durationLowS,
      durationHighS,
      otherSelections,
      bodyMapSelection,
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
      ),
    [durationLowS, durationHighS, otherSelections, bodyMapSelection],
  );
  const durationDensityPapers = useMemo(
    () =>
      filterResearchPapersIgnoringDuration(
        ALL_RESEARCH_PAPERS,
        tempLowC,
        tempHighC,
        otherSelections,
        bodyMapSelection,
      ),
    [tempLowC, tempHighC, otherSelections, bodyMapSelection],
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
      ),
    [
      tempLowC,
      tempHighC,
      durationLowS,
      durationHighS,
      otherSelections,
      bodyMapSelection,
    ],
  );

  const paperCountsByBodyRegion = useMemo(
    () => aggregateBodyCounts(filteredPapers),
    [filteredPapers],
  );
  const paperCountsByFootSubpart = useMemo(
    () => aggregateFootSubpartCounts(filteredPapers),
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
      paperCountsByFootSubpart,
      optionCounts,
      selectedBodyRegion,
      selectedFootSubpart,
      setBodyMapSelection,
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
    }),
    [
      temperatureDensityPapers,
      durationDensityPapers,
      filteredPapers,
      paperCountsByBodyRegion,
      paperCountsByFootSubpart,
      optionCounts,
      selectedBodyRegion,
      selectedFootSubpart,
      setBodyMapSelection,
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
