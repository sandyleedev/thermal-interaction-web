import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  OTHER_FILTER_CATEGORY_ORDER,
  OTHER_FILTER_OPTIONS,
  OTHER_FILTER_SECTION_TITLES,
  type OtherFilterCategory,
} from "@/lib/research/otherFilterVocab";

function otherFiltersHasSelection(
  selections: Record<OtherFilterCategory, readonly string[]>,
): boolean {
  return OTHER_FILTER_CATEGORY_ORDER.some((c) => selections[c].length > 0);
}

type FilterChipProps = {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
};

function FilterChip({ label, count, selected, onToggle }: FilterChipProps) {
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

type ChipSectionProps = {
  category: OtherFilterCategory;
  title: string;
  optionCountById: Record<string, number | undefined>;
  selectedIds: readonly string[];
  onToggle: (category: OtherFilterCategory, optionId: string) => void;
};

function ChipSection({
  category,
  title,
  optionCountById,
  selectedIds,
  onToggle,
}: ChipSectionProps) {
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
            onToggle={() => onToggle(category, opt.id)}
          />
        ))}
      </div>
    </section>
  );
}

export function OtherFiltersPanel() {
  const {
    optionCounts,
    otherSelections,
    toggleOtherChip,
    clearOtherFilters,
  } = useResearchFilter();

  const hasSelection = otherFiltersHasSelection(otherSelections);

  return (
    <section className="landing-panel landing-other-filters-panel">
      <div className="other-filters-panel-header">
        <h2 className="panel-title">Other filters</h2>
        <button
          type="button"
          className="other-filters-clear-all"
          disabled={!hasSelection}
          onClick={clearOtherFilters}
        >
          Clear all
        </button>
      </div>
      <p className="other-filters-logic-hint">
        Selection: OR within each category, AND across.
      </p>
      <div className="panel-content other-filters-panel-content">
        <ChipSection
          category="senses"
          title={OTHER_FILTER_SECTION_TITLES.senses}
          optionCountById={optionCounts.senses}
          selectedIds={otherSelections.senses}
          onToggle={toggleOtherChip}
        />
        <ChipSection
          category="purposes"
          title={OTHER_FILTER_SECTION_TITLES.purposes}
          optionCountById={optionCounts.purposes}
          selectedIds={otherSelections.purposes}
          onToggle={toggleOtherChip}
        />
        <ChipSection
          category="materials"
          title={OTHER_FILTER_SECTION_TITLES.materials}
          optionCountById={optionCounts.materials}
          selectedIds={otherSelections.materials}
          onToggle={toggleOtherChip}
        />
        <ChipSection
          category="thermalModes"
          title={OTHER_FILTER_SECTION_TITLES.thermalModes}
          optionCountById={optionCounts.thermalModes}
          selectedIds={otherSelections.thermalModes}
          onToggle={toggleOtherChip}
        />
        <ChipSection
          category="actuationMethods"
          title={OTHER_FILTER_SECTION_TITLES.actuationMethods}
          optionCountById={optionCounts.actuationMethods}
          selectedIds={otherSelections.actuationMethods}
          onToggle={toggleOtherChip}
        />
      </div>
    </section>
  );
}
