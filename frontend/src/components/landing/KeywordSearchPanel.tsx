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
        <h2 className="panel-title keyword-search-title">Search</h2>
        <label className="keyword-search-field">
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
        </label>
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
        <button
          type="button"
          className="other-filters-clear-all keyword-search-clear"
          disabled={!hasQuery}
          onClick={() => onSearchChange({ ...search, query: "" })}
        >
          Clear
        </button>
      </div>
    </section>
  );
}
