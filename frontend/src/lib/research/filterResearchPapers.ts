import {
  OTHER_FILTER_CATEGORY_ORDER,
  type OtherFilterCategory,
} from "@/lib/research/otherFilterVocab";
import {
  filterPapersByKeyword,
  DEFAULT_KEYWORD_SEARCH,
  type KeywordSearchQuery,
} from "@/lib/research/paperKeywordSearch";
import {
  type BodyMapChipSelection,
  paperMatchesBodyMapChip,
} from "@/lib/research/bodyMapChipSelection";
import type { BodyMapParentRegion } from "@/lib/research/bodyMapRegions";
import {
  OPTION_IDS_BY_CATEGORY,
  type ResearchPaper,
  paperFieldForCategory,
} from "@/lib/research/researchPapers";

export type OtherFilterSelections = Record<
  OtherFilterCategory,
  readonly string[]
>;

/**
 * Body-map facet: ordered multi-select chips (L1 and/or L2 subparts, OR match).
 */
export type BodyMapSelection = {
  /** Selection order preserved for chip UI; empty = no body-map constraint. */
  selectedChips: readonly BodyMapChipSelection[];
  /** Which detail zoom is open (navigation only). */
  activeDetailRegion?: BodyMapParentRegion | null;
};

export type RangeFilterOptions = {
  /**
   * When true (default), papers with `null` min/max °C still pass the temperature axis.
   * When false, those papers are excluded unless they report a numeric range that overlaps the slider.
   */
  includeUnspecifiedTemperature?: boolean;
  /**
   * When true (default), papers with `null` duration bounds still pass the duration axis.
   * When false, those papers are excluded unless they report a numeric range that overlaps the slider.
   */
  includeUnspecifiedDuration?: boolean;
};

const DEFAULT_RANGE_OPTS: Required<RangeFilterOptions> = {
  includeUnspecifiedTemperature: true,
  includeUnspecifiedDuration: true,
};

function resolvedRangeOpts(
  opts?: RangeFilterOptions,
): Required<RangeFilterOptions> {
  return {
    includeUnspecifiedTemperature:
      opts?.includeUnspecifiedTemperature ??
      DEFAULT_RANGE_OPTS.includeUnspecifiedTemperature,
    includeUnspecifiedDuration:
      opts?.includeUnspecifiedDuration ??
      DEFAULT_RANGE_OPTS.includeUnspecifiedDuration,
  };
}

/** True when [rangeMin, rangeMax] and [filterLow, filterHigh] overlap (both ends inclusive). */
function rangesOverlap(
  rangeMin: number,
  rangeMax: number,
  filterLow: number,
  filterHigh: number,
): boolean {
  return rangeMax >= filterLow && rangeMin <= filterHigh;
}

/** Temperature axis: overlap with slider, or pass/fail when bounds are missing. */
export function paperMatchesTemperatureAxis(
  p: ResearchPaper,
  tempLowC: number,
  tempHighC: number,
  includeUnspecified: boolean,
): boolean {
  if (p.minTempC == null || p.maxTempC == null) return includeUnspecified;
  return rangesOverlap(p.minTempC, p.maxTempC, tempLowC, tempHighC);
}

/**
 * True when the paper has a numeric duration range that should participate in overlap checks
 * and KDE samples. `0`/`0` is treated as an unknown placeholder (same as `null`).
 */
export function paperHasReportedDurationRange(
  p: ResearchPaper,
): p is ResearchPaper & { minDurationSec: number; maxDurationSec: number } {
  if (p.minDurationSec == null || p.maxDurationSec == null) return false;
  if (p.minDurationSec === 0 && p.maxDurationSec === 0) return false;
  return true;
}

/** Duration axis: overlap with slider, or pass/fail when bounds are missing. */
export function paperMatchesDurationAxis(
  p: ResearchPaper,
  durationLowS: number,
  durationHighS: number,
  includeUnspecified: boolean,
): boolean {
  if (!paperHasReportedDurationRange(p)) return includeUnspecified;
  return rangesOverlap(
    p.minDurationSec,
    p.maxDurationSec,
    durationLowS,
    durationHighS,
  );
}

/** OR within each category; AND across categories. Empty selection for a category imposes no constraint. */
export function paperMatchesOtherFilters(
  paper: ResearchPaper,
  selections: OtherFilterSelections,
): boolean {
  for (const cat of OTHER_FILTER_CATEGORY_ORDER) {
    const picked = selections[cat];
    if (!picked.length) continue;
    const tags = paperFieldForCategory(paper, cat);
    const hit = picked.some((id) => tags.includes(id));
    if (!hit) return false;
  }
  return true;
}

/** Same as {@link paperMatchesOtherFilters} but ignores one category (used for facet counts). */
export function paperMatchesOtherFiltersExceptCategory(
  paper: ResearchPaper,
  selections: OtherFilterSelections,
  skipCategory: OtherFilterCategory,
): boolean {
  for (const cat of OTHER_FILTER_CATEGORY_ORDER) {
    if (cat === skipCategory) continue;
    const picked = selections[cat];
    if (!picked.length) continue;
    const tags = paperFieldForCategory(paper, cat);
    const hit = picked.some((id) => tags.includes(id));
    if (!hit) return false;
  }
  return true;
}

export function paperMatchesBodyMapSelection(
  paper: ResearchPaper,
  selection?: BodyMapSelection,
): boolean {
  if (!selection) return true;

  const chips = selection.selectedChips ?? [];
  if (chips.length === 0) return true;

  for (const chip of chips) {
    if (paperMatchesBodyMapChip(paper, chip)) return true;
  }
  return false;
}

export function filterResearchPapers(
  papers: readonly ResearchPaper[],
  tempLowC: number,
  tempHighC: number,
  durationLowS: number,
  durationHighS: number,
  other: OtherFilterSelections,
  bodyMapSelection?: BodyMapSelection,
  rangeOpts?: RangeFilterOptions,
): ResearchPaper[] {
  const ro = resolvedRangeOpts(rangeOpts);
  return papers.filter((p) => {
    if (
      !paperMatchesTemperatureAxis(
        p,
        tempLowC,
        tempHighC,
        ro.includeUnspecifiedTemperature,
      )
    ) {
      return false;
    }
    if (
      !paperMatchesDurationAxis(
        p,
        durationLowS,
        durationHighS,
        ro.includeUnspecifiedDuration,
      )
    ) {
      return false;
    }
    if (!paperMatchesOtherFilters(p, other)) return false;
    if (!paperMatchesBodyMapSelection(p, bodyMapSelection)) return false;
    return true;
  });
}

/**
 * Same as {@link filterResearchPapers} but ignores the temperature range filter.
 * Used for KDE reference curves so moving the slider does not reshuffle the density shape.
 */
export function filterResearchPapersIgnoringTemperature(
  papers: readonly ResearchPaper[],
  durationLowS: number,
  durationHighS: number,
  other: OtherFilterSelections,
  bodyMapSelection?: BodyMapSelection,
  rangeOpts?: RangeFilterOptions,
): ResearchPaper[] {
  const ro = resolvedRangeOpts(rangeOpts);
  return papers.filter((p) => {
    if (
      !paperMatchesDurationAxis(
        p,
        durationLowS,
        durationHighS,
        ro.includeUnspecifiedDuration,
      )
    ) {
      return false;
    }
    if (!paperMatchesOtherFilters(p, other)) return false;
    if (!paperMatchesBodyMapSelection(p, bodyMapSelection)) return false;
    return true;
  });
}

/**
 * Same as {@link filterResearchPapers} but ignores the duration range filter.
 * Used for duration slider range coverage labels.
 */
export function filterResearchPapersIgnoringDuration(
  papers: readonly ResearchPaper[],
  tempLowC: number,
  tempHighC: number,
  other: OtherFilterSelections,
  bodyMapSelection?: BodyMapSelection,
  rangeOpts?: RangeFilterOptions,
): ResearchPaper[] {
  const ro = resolvedRangeOpts(rangeOpts);
  return papers.filter((p) => {
    if (
      !paperMatchesTemperatureAxis(
        p,
        tempLowC,
        tempHighC,
        ro.includeUnspecifiedTemperature,
      )
    ) {
      return false;
    }
    if (!paperMatchesOtherFilters(p, other)) return false;
    if (!paperMatchesBodyMapSelection(p, bodyMapSelection)) return false;
    return true;
  });
}

/**
 * Papers after temp/duration and all “other” filters except one category (no constraint on that facet).
 */
export function filterPapersExceptOtherCategory(
  papers: readonly ResearchPaper[],
  tempLowC: number,
  tempHighC: number,
  durationLowS: number,
  durationHighS: number,
  selections: OtherFilterSelections,
  skipCategory: OtherFilterCategory,
  bodyMapSelection?: BodyMapSelection,
  rangeOpts?: RangeFilterOptions,
): ResearchPaper[] {
  const ro = resolvedRangeOpts(rangeOpts);
  return papers.filter((p) => {
    if (
      !paperMatchesTemperatureAxis(
        p,
        tempLowC,
        tempHighC,
        ro.includeUnspecifiedTemperature,
      )
    ) {
      return false;
    }
    if (
      !paperMatchesDurationAxis(
        p,
        durationLowS,
        durationHighS,
        ro.includeUnspecifiedDuration,
      )
    ) {
      return false;
    }
    if (!paperMatchesOtherFiltersExceptCategory(p, selections, skipCategory)) {
      return false;
    }
    if (!paperMatchesBodyMapSelection(p, bodyMapSelection)) return false;
    return true;
  });
}

/**
 * Faceted counts per category C: pool = papers matching temp, duration, and every “other”
 * facet except C (selections in C are ignored). Each option count is how many papers in that
 * pool carry that tag on C (marginal per tag). Same-category selections therefore do not move
 * sibling chip counts; selections in other categories still constrain the pool.
 */
export function otherFilterOptionCounts(
  papers: readonly ResearchPaper[],
  tempLowC: number,
  tempHighC: number,
  durationLowS: number,
  durationHighS: number,
  selections: OtherFilterSelections,
  bodyMapSelection?: BodyMapSelection,
  rangeOpts?: RangeFilterOptions,
  keywordSearch?: KeywordSearchQuery,
): Record<OtherFilterCategory, Record<string, number>> {
  const out = {} as Record<OtherFilterCategory, Record<string, number>>;
  for (const cat of OTHER_FILTER_CATEGORY_ORDER) {
    const pool = filterPapersByKeyword(
      filterPapersExceptOtherCategory(
        papers,
        tempLowC,
        tempHighC,
        durationLowS,
        durationHighS,
        selections,
        cat,
        bodyMapSelection,
        rangeOpts,
      ),
      keywordSearch ?? DEFAULT_KEYWORD_SEARCH,
    );
    const optionIds = OPTION_IDS_BY_CATEGORY[cat];
    const m: Record<string, number> = {};
    for (const id of optionIds) {
      let n = 0;
      for (const p of pool) {
        if (paperFieldForCategory(p, cat).includes(id)) n++;
      }
      m[id] = n;
    }
    out[cat] = m;
  }
  return out;
}
