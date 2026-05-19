import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  OTHER_FILTER_OPTIONS,
  OTHER_FILTER_SECTION_TITLES,
  type OtherFilterCategory,
} from "@/lib/research/otherFilterVocab";

const OTHER_FILTERS_LOGIC_TOOLTIP =
  "Select multiple options within a category (OR), and combine categories (AND)";

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

export type OtherFilterCategoryPanelProps = {
  category: OtherFilterCategory;
  /** Show OR/AND logic tooltip beside the panel title (first category panel only). */
  showFilterLogicInfo?: boolean;
  className?: string;
};

export function OtherFilterCategoryPanel({
  category,
  showFilterLogicInfo = false,
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
          {showFilterLogicInfo ? <OtherFiltersLogicInfoButton /> : null}
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
