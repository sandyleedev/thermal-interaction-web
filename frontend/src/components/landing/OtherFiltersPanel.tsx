import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  OTHER_FILTER_CATEGORY_ORDER,
  OTHER_FILTER_OPTIONS,
  OTHER_FILTER_SECTION_TITLES,
  type OtherFilterCategory,
} from "@/lib/research/otherFilterVocab";

const OTHER_FILTERS_LOGIC_TOOLTIP =
  "Select multiple options within a category (OR), and combine categories (AND)";

function otherFiltersHasSelection(
  selections: Record<OtherFilterCategory, readonly string[]>,
): boolean {
  return OTHER_FILTER_CATEGORY_ORDER.some((c) => selections[c].length > 0);
}

function OtherFiltersLogicInfoButton() {
  const tooltipId = useId();
  const [tipOpen, setTipOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tipOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setTipOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [tipOpen]);

  useEffect(() => {
    if (!tipOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTipOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tipOpen]);

  return (
    <div
      ref={wrapRef}
      className={[
        "other-filters-info-wrap",
        tipOpen && "other-filters-info-wrap--open",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="other-filters-info-btn"
        aria-label="How filtering works"
        aria-expanded={tipOpen}
        aria-controls={tooltipId}
        onClick={() => setTipOpen((v) => !v)}
      >
        <span className="other-filters-info-icon" aria-hidden>
          {"\u24D8"}
        </span>
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        className="other-filters-info-tooltip"
      >
        {OTHER_FILTERS_LOGIC_TOOLTIP}
      </div>
    </div>
  );
}

type FilterChipProps = {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
};

export function FilterChip({ label, count, selected, onToggle }: FilterChipProps) {
  return (
    <button
      type="button"
      className={[
        "filter-chip",
        selected ? "filter-chip--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={selected}
      onClick={onToggle}
    >
      <span className="filter-chip-label">{label}</span>
      <span className="filter-chip-count" aria-hidden>
        {" "}
        ({count})
      </span>
    </button>
  );
}

type StaticCategorySectionProps = {
  category: OtherFilterCategory;
  title: string;
  optionCountById: Record<string, number | undefined>;
  selectedIds: readonly string[];
  onToggleChip: (category: OtherFilterCategory, optionId: string) => void;
};

function StaticCategorySection({
  category,
  title,
  optionCountById,
  selectedIds,
  onToggleChip,
}: StaticCategorySectionProps) {
  const options = OTHER_FILTER_OPTIONS[category];
  return (
    <section
      className="other-filters-section"
      aria-labelledby={`other-filters-heading-${category}`}
    >
      <h3 className="other-filters-section-title" id={`other-filters-heading-${category}`}>
        {title}
      </h3>
      <div className="other-filters-chip-row" role="group" aria-label={title}>
        {options.map((opt) => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            count={optionCountById[opt.id] ?? 0}
            selected={selectedIds.includes(opt.id)}
            onToggle={() => onToggleChip(category, opt.id)}
          />
        ))}
      </div>
    </section>
  );
}

export type OtherFiltersPanelProps = {
  excludeCategories?: readonly OtherFilterCategory[];
  className?: string;
};

export function OtherFiltersPanel({
  excludeCategories = [],
  className,
}: OtherFiltersPanelProps = {}) {
  const {
    optionCounts,
    otherSelections,
    toggleOtherChip,
    clearOtherFilters,
  } = useResearchFilter();

  const hasSelection = otherFiltersHasSelection(otherSelections);

  const categoriesToShow = useMemo(() => {
    const ex = new Set(excludeCategories);
    return OTHER_FILTER_CATEGORY_ORDER.filter((c) => !ex.has(c));
  }, [excludeCategories]);

  return (
    <section
      className={[
        "landing-panel",
        "landing-other-filters-panel",
        "landing-other-filters-panel--flat-sections",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="other-filters-panel-header">
        <div className="other-filters-panel-title-cluster">
          <h2 className="panel-title">Other filters</h2>
          <OtherFiltersLogicInfoButton />
        </div>
        <button
          type="button"
          className="other-filters-clear-all"
          disabled={!hasSelection}
          onClick={clearOtherFilters}
        >
          Clear all
        </button>
      </div>
      <div className="panel-content other-filters-panel-content">
        {categoriesToShow.map((category) => (
          <StaticCategorySection
            key={category}
            category={category}
            title={OTHER_FILTER_SECTION_TITLES[category]}
            optionCountById={optionCounts[category]}
            selectedIds={otherSelections[category]}
            onToggleChip={toggleOtherChip}
          />
        ))}
      </div>
    </section>
  );
}
