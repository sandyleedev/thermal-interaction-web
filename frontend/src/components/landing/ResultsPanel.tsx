import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { KeywordSearchPanel } from "@/components/landing/KeywordSearchPanel";
import { formatPaperDisplay } from "@/lib/research/formatPaperDisplay";
import { saveLandingScrollPosition } from "@/lib/navigation/landingScrollRestore";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { PaperThumbnailPlaceholder } from "@/components/landing/PaperThumbnailPlaceholder";

const RESULTS_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
type ResultsPageSize = (typeof RESULTS_PAGE_SIZE_OPTIONS)[number];
const DEFAULT_RESULTS_PAGE_SIZE: ResultsPageSize = 10;
const VISIBLE_PAGE_BUTTONS = 5;

const RESULTS_LAYOUT_OPTIONS = ["list", "gallery"] as const;
type ResultsLayout = (typeof RESULTS_LAYOUT_OPTIONS)[number];
const RESULTS_LAYOUT_STORAGE_KEY = "landing-results-layout";

function readStoredResultsLayout(): ResultsLayout {
  try {
    const stored = localStorage.getItem(RESULTS_LAYOUT_STORAGE_KEY);
    if (stored === "list" || stored === "gallery") return stored;
  } catch {
    /* private mode / blocked storage */
  }
  return "list";
}

function persistResultsLayout(layout: ResultsLayout): void {
  try {
    localStorage.setItem(RESULTS_LAYOUT_STORAGE_KEY, layout);
  } catch {
    /* ignore */
  }
}

function lastNameOf(author: string): string {
  const name = author.trim();
  if (!name) return "";
  if (name.includes(",")) {
    const [last] = name.split(",");
    return last.trim();
  }
  const parts = name.split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

function listAuthorsLabel(authors: string): string {
  const parsed = authors
    .split(";")
    .map((a) => a.trim())
    .filter(Boolean);
  if (parsed.length <= 2) {
    return parsed.map(lastNameOf).join(", ");
  }
  return `${lastNameOf(parsed[0])} et al.`;
}

function visiblePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible = VISIBLE_PAGE_BUTTONS,
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  let start = currentPage - Math.floor(maxVisible / 2);
  let end = start + maxVisible - 1;
  if (start < 1) {
    start = 1;
    end = maxVisible;
  }
  if (end > totalPages) {
    end = totalPages;
    start = totalPages - maxVisible + 1;
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

type ResultsPageSizeSelectorProps = {
  pageSize: ResultsPageSize;
  onPageSizeChange: (size: ResultsPageSize) => void;
};

function ResultsPageSizeSelector({
  pageSize,
  onPageSizeChange,
}: ResultsPageSizeSelectorProps) {
  return (
    <div
      className="results-page-size"
      role="group"
      aria-label="Papers per page"
    >
      <span className="results-page-size-label">Per page</span>
      {RESULTS_PAGE_SIZE_OPTIONS.map((size) => (
        <button
          key={size}
          type="button"
          className={[
            "results-page-size-btn",
            pageSize === size && "results-page-size-btn--active",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={pageSize === size}
          onClick={() => onPageSizeChange(size)}
        >
          {size}
        </button>
      ))}
    </div>
  );
}

const RESULTS_LAYOUT_TOGGLE: Record<
  ResultsLayout,
  { label: string; title: string }
> = {
  list: { label: "List layout", title: "List view" },
  gallery: { label: "Gallery layout", title: "Gallery view (2 columns)" },
};

function ResultsListLayoutIcon() {
  return (
    <svg
      className="results-layout-toggle-btn__icon"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4.25 6h11.5M4.25 10h11.5M4.25 14h7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResultsGalleryLayoutIcon() {
  return (
    <svg
      className="results-layout-toggle-btn__icon"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="4"
        y="4"
        width="5.25"
        height="5.25"
        rx="1.1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="10.75"
        y="4"
        width="5.25"
        height="5.25"
        rx="1.1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="4"
        y="10.75"
        width="5.25"
        height="5.25"
        rx="1.1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="10.75"
        y="10.75"
        width="5.25"
        height="5.25"
        rx="1.1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

type ResultsLayoutSelectorProps = {
  layout: ResultsLayout;
  onLayoutChange: (layout: ResultsLayout) => void;
};

function ResultsLayoutSelector({
  layout,
  onLayoutChange,
}: ResultsLayoutSelectorProps) {
  return (
    <div
      className="results-layout-toggle"
      role="group"
      aria-label="Results layout"
    >
      {RESULTS_LAYOUT_OPTIONS.map((mode) => {
        const { label, title } = RESULTS_LAYOUT_TOGGLE[mode];
        return (
          <button
            key={mode}
            type="button"
            className={[
              "results-layout-toggle-btn",
              layout === mode && "results-layout-toggle-btn--active",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={label}
            aria-pressed={layout === mode}
            title={title}
            onClick={() => onLayoutChange(mode)}
          >
            {mode === "list" ? (
              <ResultsListLayoutIcon />
            ) : (
              <ResultsGalleryLayoutIcon />
            )}
          </button>
        );
      })}
    </div>
  );
}

type ResultsListToolbarProps = {
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  layout: ResultsLayout;
  onLayoutChange: (layout: ResultsLayout) => void;
  pageSize: ResultsPageSize;
  onPageSizeChange: (size: ResultsPageSize) => void;
};

function ResultsListToolbar({
  rangeStart,
  rangeEnd,
  totalCount,
  layout,
  onLayoutChange,
  pageSize,
  onPageSizeChange,
}: ResultsListToolbarProps) {
  return (
    <div className="results-list-toolbar">
      <p className="results-pagination-range" aria-live="polite">
        Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of{" "}
        {totalCount.toLocaleString()}
      </p>
      <div className="results-list-toolbar-controls">
        <ResultsLayoutSelector
          layout={layout}
          onLayoutChange={onLayoutChange}
        />
        <ResultsPageSizeSelector
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}

type ResultsPaginationNavProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function ResultsPaginationNav({
  currentPage,
  totalPages,
  onPageChange,
}: ResultsPaginationNavProps) {
  const pageNumbers = visiblePageNumbers(currentPage, totalPages);

  return (
    <div className="results-pagination-block">
      <nav className="results-pagination" aria-label="Results pagination">
        <button
          type="button"
          className="results-pagination-btn results-pagination-btn--edge"
          disabled={currentPage <= 1}
          aria-label="First page"
          onClick={() => onPageChange(1)}
        >
          <span aria-hidden>◀◀</span>
        </button>
        <button
          type="button"
          className="results-pagination-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Prev
        </button>
        <div
          className="results-pagination-pages"
          role="group"
          aria-label="Page numbers"
        >
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              className={[
                "results-pagination-page",
                pageNum === currentPage && "results-pagination-page--current",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === currentPage ? "page" : undefined}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="results-pagination-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
        <button
          type="button"
          className="results-pagination-btn results-pagination-btn--edge"
          disabled={currentPage >= totalPages}
          aria-label="Last page"
          onClick={() => onPageChange(totalPages)}
        >
          <span aria-hidden>▶▶</span>
        </button>
      </nav>
    </div>
  );
}

export function ResultsPanel() {
  const {
    filteredPapers,
    filteredPaperCount,
    facetFilteredPaperCount,
    totalPaperCount,
    keywordSearch,
    setKeywordSearch,
    hasActiveKeywordSearch,
  } = useResearchFilter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ResultsPageSize>(
    DEFAULT_RESULTS_PAGE_SIZE,
  );
  const [resultsLayout, setResultsLayout] = useState<ResultsLayout>(
    readStoredResultsLayout,
  );
  const skipScrollOnMountRef = useRef(true);
  const resultsPanelRef = useRef<HTMLElement>(null);

  const rows = useMemo(
    () => filteredPapers.map((p) => formatPaperDisplay(p)),
    [filteredPapers],
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const showPagination = rows.length > pageSize;

  useEffect(() => {
    setPage(1);
  }, [rows, pageSize, keywordSearch]);

  useEffect(() => {
    if (skipScrollOnMountRef.current) {
      skipScrollOnMountRef.current = false;
      return;
    }
    const panel = resultsPanelRef.current;
    if (!panel) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    panel.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [currentPage]);

  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(pageStartIndex, pageStartIndex + pageSize);
  const rangeStart = rows.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, rows.length);

  const handleLayoutChange = (layout: ResultsLayout) => {
    setResultsLayout(layout);
    persistResultsLayout(layout);
  };

  return (
    <div className="landing-results-column">
      <KeywordSearchPanel
        search={keywordSearch}
        onSearchChange={setKeywordSearch}
      />
      <section
        ref={resultsPanelRef}
        className="landing-panel landing-results"
      >
        <h2 className="panel-title">Results</h2>
        <div className="panel-content landing-results-inner">
          <p className="landing-results-summary">
            <strong>{filteredPaperCount.toLocaleString()}</strong>
            {" papers match"}
            {hasActiveKeywordSearch ? (
              <span className="landing-results-out-of">
                {" "}
                (of {facetFilteredPaperCount.toLocaleString()} after filters)
              </span>
            ) : (
              <span className="landing-results-out-of">
                {" "}
                (of {totalPaperCount.toLocaleString()} total)
              </span>
            )}
          </p>

          {rows.length > 0 ? (
            <ResultsListToolbar
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              totalCount={rows.length}
              layout={resultsLayout}
              onLayoutChange={handleLayoutChange}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          ) : null}

        <ul
          className={[
            "results-paper-list",
            resultsLayout === "gallery"
              ? "results-paper-list--gallery"
              : "results-paper-list--list",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Matching papers"
        >
          {pageRows.map((paper) => (
            <li key={paper.id} className="results-paper-item">
              <Link
                to={`/paper/${paper.id}`}
                className="results-paper-card"
                onClick={saveLandingScrollPosition}
              >
                <div className="results-paper-card__thumb">
                  <PaperThumbnailPlaceholder
                    label={paper.title}
                    imageUrls={paper.thumbnailUrls}
                  />
                </div>
                <div className="results-paper-card__body">
                  <h3 className="results-paper-card__title">{paper.title}</h3>
                  <p className="results-paper-card__meta">
                    {[
                      listAuthorsLabel(paper.authors),
                      paper.publicationYear != null
                        ? String(paper.publicationYear)
                        : null,
                      paper.publicationVenue ?? null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="results-paper-card__tags">
                    {paper.keywords.map((tag, i) => (
                      <span
                        key={`${paper.id}-tag-${i}-${tag}`}
                        className="results-paper-chip"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {showPagination ? (
          <ResultsPaginationNav
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        ) : null}
        </div>
      </section>
    </div>
  );
}
