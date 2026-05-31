import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { KeywordSearchPanel } from "@/components/landing/KeywordSearchPanel";
import { formatPaperDisplay } from "@/lib/research/formatPaperDisplay";
import { useResearchFilter } from "@/context/ResearchFilterContext";
import { PaperThumbnailPlaceholder } from "@/components/landing/PaperThumbnailPlaceholder";

const RESULTS_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
type ResultsPageSize = (typeof RESULTS_PAGE_SIZE_OPTIONS)[number];
const DEFAULT_RESULTS_PAGE_SIZE: ResultsPageSize = 10;
const VISIBLE_PAGE_BUTTONS = 5;

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

type ResultsListToolbarProps = {
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  pageSize: ResultsPageSize;
  onPageSizeChange: (size: ResultsPageSize) => void;
};

function ResultsListToolbar({
  rangeStart,
  rangeEnd,
  totalCount,
  pageSize,
  onPageSizeChange,
}: ResultsListToolbarProps) {
  return (
    <div className="results-list-toolbar">
      <p className="results-pagination-range" aria-live="polite">
        Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of{" "}
        {totalCount.toLocaleString()}
      </p>
      <ResultsPageSizeSelector
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
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
          Previous
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
  const skipScrollOnMountRef = useRef(true);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, pageSize]);

  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(pageStartIndex, pageStartIndex + pageSize);
  const rangeStart = rows.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, rows.length);

  return (
    <div className="landing-results-column">
      <KeywordSearchPanel
        search={keywordSearch}
        onSearchChange={setKeywordSearch}
      />
      <section className="landing-panel landing-results">
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
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        ) : null}

        <ul className="results-paper-list" aria-label="Matching papers">
          {pageRows.map((paper) => (
            <li key={paper.id} className="results-paper-item">
              <Link
                to={`/paper/${paper.id}`}
                className="results-paper-card"
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
