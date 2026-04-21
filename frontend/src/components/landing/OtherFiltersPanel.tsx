import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import {
  OTHER_FILTER_CATEGORY_GRID_LABELS,
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

/** Demo 2 / Demo 3: static heading + chips always visible. */
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

type CategoryOverlayPortalProps = {
  category: OtherFilterCategory;
  ariaTitle: string;
  anchorButton: HTMLButtonElement | null;
  panelId: string;
  triggerId: string;
  optionCountById: Record<string, number | undefined>;
  selectedIds: readonly string[];
  onToggleChip: (category: OtherFilterCategory, optionId: string) => void;
};

function CategoryOverlayPortal({
  category,
  ariaTitle,
  anchorButton,
  panelId,
  triggerId,
  optionCountById,
  selectedIds,
  onToggleChip,
}: CategoryOverlayPortalProps) {
  const options = OTHER_FILTER_OPTIONS[category];
  const [box, setBox] = useState({
    top: 0,
    left: 0,
    width: 260,
  });

  const updatePosition = useCallback(() => {
    if (!anchorButton) return;
    const rect = anchorButton.getBoundingClientRect();
    const pad = 8;
    const minW = Math.max(rect.width, 248);
    const maxW = Math.min(minW, window.innerWidth - pad * 2);
    let left = rect.left;
    if (left + maxW > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - maxW);
    }
    if (left < pad) left = pad;
    setBox({
      top: rect.bottom + 4,
      left,
      width: maxW,
    });
  }, [anchorButton]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  return createPortal(
    <div
      id={panelId}
      role="region"
      aria-labelledby={triggerId}
      className="other-filters-category-overlay-panel"
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.width,
        zIndex: 1100,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="other-filters-chip-row" role="group" aria-label={ariaTitle}>
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
    </div>,
    document.body,
  );
}

type DropdownGridTriggerProps = {
  category: OtherFilterCategory;
  gridLabel: string;
  isOpen: boolean;
  overlayPanelId: string;
  setButtonRef: (el: HTMLButtonElement | null) => void;
  onTriggerClick: () => void;
};

/** Demo 1: grid cell is trigger only; overlay is portaled. */
function DropdownGridTrigger({
  category,
  gridLabel,
  isOpen,
  overlayPanelId,
  setButtonRef,
  onTriggerClick,
}: DropdownGridTriggerProps) {
  const triggerId = `other-filter-trigger-${category}`;
  return (
    <div className="other-filters-dropdown-cell">
      <button
        ref={setButtonRef}
        type="button"
        id={triggerId}
        className={[
          "other-filters-category-trigger",
          isOpen && "other-filters-category-trigger--open",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? overlayPanelId : undefined}
        onClick={onTriggerClick}
      >
        <span className="other-filters-category-trigger-label">{gridLabel}</span>
        <span className="other-filters-category-trigger-chevron" aria-hidden>
          {isOpen ? "▴" : "▾"}
        </span>
      </button>
    </div>
  );
}

export type OtherFiltersPanelProps = {
  excludeCategories?: readonly OtherFilterCategory[];
  className?: string;
  categoryLayout?: "flat" | "dropdownGrid";
};

export function OtherFiltersPanel({
  excludeCategories = [],
  className,
  categoryLayout = "flat",
}: OtherFiltersPanelProps = {}) {
  const {
    optionCounts,
    otherSelections,
    toggleOtherChip,
    clearOtherFilters,
  } = useResearchFilter();

  const hasSelection = otherFiltersHasSelection(otherSelections);
  const [openCategory, setOpenCategory] = useState<OtherFilterCategory | null>(
    null,
  );
  const buttonRefs = useRef<Map<OtherFilterCategory, HTMLButtonElement>>(
    new Map(),
  );
  const overlayPanelId = useId();

  const categoriesToShow = useMemo(() => {
    const ex = new Set(excludeCategories);
    return OTHER_FILTER_CATEGORY_ORDER.filter((c) => !ex.has(c));
  }, [excludeCategories]);

  useEffect(() => {
    if (openCategory && !categoriesToShow.includes(openCategory)) {
      setOpenCategory(null);
    }
  }, [categoriesToShow, openCategory]);

  const setButtonRef = useCallback(
    (category: OtherFilterCategory) => (el: HTMLButtonElement | null) => {
      if (el) buttonRefs.current.set(category, el);
      else buttonRefs.current.delete(category);
    },
    [],
  );

  const handleTriggerClick = useCallback((category: OtherFilterCategory) => {
    setOpenCategory((prev) => (prev === category ? null : category));
  }, []);

  useEffect(() => {
    if (!openCategory || categoryLayout !== "dropdownGrid") return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      const panel = document.getElementById(overlayPanelId);
      if (panel?.contains(t)) return;
      for (const btn of buttonRefs.current.values()) {
        if (btn === t || btn.contains(t)) return;
      }
      setOpenCategory(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [openCategory, categoryLayout, overlayPanelId]);

  useEffect(() => {
    if (!openCategory || categoryLayout !== "dropdownGrid") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenCategory(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openCategory, categoryLayout]);

  const layoutModifierClass =
    categoryLayout === "dropdownGrid"
      ? "landing-other-filters-panel--dropdown-grid"
      : "landing-other-filters-panel--flat-sections";

  const anchorButton =
    openCategory ? buttonRefs.current.get(openCategory) ?? null : null;

  return (
    <section
      className={[
        "landing-panel",
        "landing-other-filters-panel",
        layoutModifierClass,
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
        {categoryLayout === "dropdownGrid" ? (
          <>
            <div className="other-filters-dropdown-grid">
              {categoriesToShow.map((category) => (
                <DropdownGridTrigger
                  key={category}
                  category={category}
                  gridLabel={OTHER_FILTER_CATEGORY_GRID_LABELS[category]}
                  isOpen={openCategory === category}
                  overlayPanelId={overlayPanelId}
                  setButtonRef={setButtonRef(category)}
                  onTriggerClick={() => handleTriggerClick(category)}
                />
              ))}
              {categoriesToShow.length % 2 === 1 ? (
                <div
                  className="other-filters-dropdown-grid-spacer"
                  aria-hidden
                />
              ) : null}
            </div>
            {openCategory && anchorButton ? (
              <CategoryOverlayPortal
                category={openCategory}
                ariaTitle={OTHER_FILTER_SECTION_TITLES[openCategory]}
                anchorButton={anchorButton}
                panelId={overlayPanelId}
                triggerId={`other-filter-trigger-${openCategory}`}
                optionCountById={optionCounts[openCategory]}
                selectedIds={otherSelections[openCategory]}
                onToggleChip={toggleOtherChip}
              />
            ) : null}
          </>
        ) : (
          categoriesToShow.map((category) => (
            <StaticCategorySection
              key={category}
              category={category}
              title={OTHER_FILTER_SECTION_TITLES[category]}
              optionCountById={optionCounts[category]}
              selectedIds={otherSelections[category]}
              onToggleChip={toggleOtherChip}
            />
          ))
        )}
      </div>
    </section>
  );
}
