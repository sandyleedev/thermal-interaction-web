import { useResearchFilter } from "@/context/ResearchFilterContext";
import { FilterChip } from "@/components/landing/OtherFiltersPanel";
import {
  OTHER_FILTER_OPTIONS,
  type OtherFilterCategory,
} from "@/lib/research/otherFilterVocab";

const CATEGORY: OtherFilterCategory = "senses";

/**
 * Senses facet as a Duration-style card (Demo 3 top area only). Same chips and filter state as Other filters.
 */
export function SensesPanel() {
  const { optionCounts, otherSelections, toggleOtherChip } = useResearchFilter();
  const optionCountById = optionCounts.senses;
  const selectedIds = otherSelections.senses;
  const options = OTHER_FILTER_OPTIONS.senses;

  return (
    <section className="landing-panel landing-panel-top landing-demo3-senses-panel">
      <h2 className="panel-title">Senses</h2>
      <div className="panel-content landing-demo3-senses-panel-content">
        <div
          className="other-filters-chip-row landing-demo3-senses-chip-grid"
          role="group"
          aria-label="Senses"
        >
          {options.map((opt) => (
            <FilterChip
              key={opt.id}
              label={opt.label}
              count={optionCountById[opt.id] ?? 0}
              selected={selectedIds.includes(opt.id)}
              onToggle={() => toggleOtherChip(CATEGORY, opt.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
