import {
  KEYWORD_SEARCH_FIELD_OPTIONS,
  keywordSearchFieldLabel,
  type KeywordSearchField,
  type KeywordSearchQuery,
} from "@/lib/research/paperKeywordSearch";

type KeywordSearchPanelProps = {
  search: KeywordSearchQuery;
  onSearchChange: (search: KeywordSearchQuery) => void;
};

const PLACEHOLDER_BY_FIELD: Record<KeywordSearchField, string> = {
  all: "Search all fields…",
  title: "Search titles…",
  authors: "Search authors…",
  publication: "Year, venue, DOI…",
  details: "Study setup, hardware, summaries…",
};

export function KeywordSearchPanel({
  search,
  onSearchChange,
}: KeywordSearchPanelProps) {
  const hasQuery = search.query.trim().length > 0;
  const scopeLabel = keywordSearchFieldLabel(search.field);

  return (
    <section className="landing-panel landing-keyword-search">
      <div className="keyword-search-toolbar">
        <span className="keyword-search-icon" role="img" aria-label="Search">
          <svg
            className="keyword-search-icon-svg"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <circle
              cx="8.5"
              cy="8.5"
              r="4.75"
              stroke="currentColor"
              strokeWidth="1.85"
            />
            <path
              d="M12.5 12.5L16 16"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <select
          className="keyword-search-scope"
          value={search.field}
          aria-label="Search field"
          title={`Search in: ${scopeLabel}`}
          onChange={(event) =>
            onSearchChange({
              ...search,
              field: event.target.value as KeywordSearchField,
            })
          }
        >
          {KEYWORD_SEARCH_FIELD_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <label
          className={
            hasQuery
              ? "keyword-search-field keyword-search-field--has-query"
              : "keyword-search-field"
          }
        >
          <span className="visually-hidden">Search papers</span>
          <input
            type="search"
            className="keyword-search-input"
            value={search.query}
            placeholder={PLACEHOLDER_BY_FIELD[search.field]}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) =>
              onSearchChange({ ...search, query: event.target.value })
            }
          />
          {hasQuery ? (
            <button
              type="button"
              className="keyword-search-input-clear"
              aria-label="Clear search"
              onClick={() => onSearchChange({ ...search, query: "" })}
            >
              <span aria-hidden>×</span>
            </button>
          ) : null}
        </label>
      </div>
    </section>
  );
}
