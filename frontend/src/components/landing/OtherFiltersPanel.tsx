import { useResearchFilter } from "@/context/ResearchFilterContext";
import { FilterPanelInfoButton } from "@/components/landing/FilterPanelInfoButton";
import {
  OTHER_FILTER_OPTIONS,
  OTHER_FILTER_SECTION_TITLES,
  type OtherFilterCategory,
} from "@/lib/research/otherFilterVocab";

const OTHER_FILTERS_LOGIC_TOOLTIP =
  "Select multiple options within a category (OR), and combine categories (AND)";

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

export type OtherFilterCategoryPanelProps = {
  category: OtherFilterCategory;
  className?: string;
};

export function OtherFilterCategoryPanel({
  category,
  className,
}: OtherFilterCategoryPanelProps) {
  const {
    optionCounts,
    otherSelections,
    toggleOtherChip,
    clearOtherFilterCategory,
  } = useResearchFilter();

  const title = OTHER_FILTER_SECTION_TITLES[category];
  const options = OTHER_FILTER_OPTIONS[category];
  const selectedIds = otherSelections[category];
  const hasSelection = selectedIds.length > 0;

  return (
    <section
      className={[
        "landing-panel",
        "landing-other-filter-category-panel",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="other-filter-category-panel-header">
        <div className="other-filter-category-title-cluster">
          <h2 className="panel-title">{title}</h2>
          <FilterPanelInfoButton
            tooltip={OTHER_FILTERS_LOGIC_TOOLTIP}
            ariaLabel="How category filtering works"
          />
        </div>
        <button
          type="button"
          className="other-filters-clear-all"
          disabled={!hasSelection}
          onClick={() => clearOtherFilterCategory(category)}
        >
          Clear
        </button>
      </div>
      <div className="panel-content other-filter-category-panel-content">
        <div className="other-filters-chip-row" role="group" aria-label={title}>
          {options.map((opt) => (
            <FilterChip
              key={opt.id}
              label={opt.label}
              count={optionCounts[category][opt.id] ?? 0}
              selected={selectedIds.includes(opt.id)}
              onToggle={() => toggleOtherChip(category, opt.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
