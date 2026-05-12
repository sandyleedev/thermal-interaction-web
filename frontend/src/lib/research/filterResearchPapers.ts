import { rangeOverlapsFilter } from "@/components/temperature-panel/temperaturePanelUtils";
import {
  OTHER_FILTER_CATEGORY_ORDER,
  type OtherFilterCategory,
} from "@/lib/research/otherFilterVocab";
import {
  type BodyMapParentRegion,
  paperMatchesBodyMapFineSelection,
  paperTouchesBodyMapParent,
} from "@/lib/research/bodyMapRegionUtils";
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
 * Body-map facet. L1 is always used on the full-body map; L2 is reserved for the future zoomed SVG.
 */
export type BodyMapSelection = {
  /** L1 map filter: `BodyMapParentRegion` (SVG row or `wholeBody`). */
  coarseBodyRegion: BodyMapParentRegion | null;
  /**
   * Fine slice under `coarseBodyRegion` (Level 2). Ignored until the zoomed map exists.
   * When null/empty, only the coarse region filter applies.
   */
  fineSubregion?: string | null;
};

export function durationRangeOverlapsFilter(
  minS: number,
  maxS: number,
  filterLowS: number,
  filterHighS: number,
): boolean {
  return maxS >= filterLowS && minS <= filterHighS;
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
  if (!selection?.coarseBodyRegion) return true;
  const fine = selection.fineSubregion?.trim();
  if (!fine) {
    return paperTouchesBodyMapParent(paper, selection.coarseBodyRegion);
  }
  return paperMatchesBodyMapFineSelection(
    paper,
    selection.coarseBodyRegion,
    fine,
  );
}

export function filterResearchPapers(
  papers: readonly ResearchPaper[],
  tempLowC: number,
  tempHighC: number,
  durationLowS: number,
  durationHighS: number,
  other: OtherFilterSelections,
  bodyMapSelection?: BodyMapSelection,
): ResearchPaper[] {
  return papers.filter((p) => {
    if (!rangeOverlapsFilter(p.minC, p.maxC, tempLowC, tempHighC)) {
      return false;
    }
    if (
      !durationRangeOverlapsFilter(
        p.durationMinS,
        p.durationMaxS,
        durationLowS,
        durationHighS,
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
): ResearchPaper[] {
  return papers.filter((p) => {
    if (
      !durationRangeOverlapsFilter(
        p.durationMinS,
        p.durationMaxS,
        durationLowS,
        durationHighS,
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
): ResearchPaper[] {
  return papers.filter((p) => {
    if (!rangeOverlapsFilter(p.minC, p.maxC, tempLowC, tempHighC)) {
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
): ResearchPaper[] {
  return papers.filter((p) => {
    if (!rangeOverlapsFilter(p.minC, p.maxC, tempLowC, tempHighC)) {
      return false;
    }
    if (
      !durationRangeOverlapsFilter(
        p.durationMinS,
        p.durationMaxS,
        durationLowS,
        durationHighS,
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
): Record<OtherFilterCategory, Record<string, number>> {
  const out = {} as Record<OtherFilterCategory, Record<string, number>>;
  for (const cat of OTHER_FILTER_CATEGORY_ORDER) {
    const pool = filterPapersExceptOtherCategory(
      papers,
      tempLowC,
      tempHighC,
      durationLowS,
      durationHighS,
      selections,
      cat,
      bodyMapSelection,
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
