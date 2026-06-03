import { KeywordSearchPanel } from "@/components/landing/KeywordSearchPanel";
import { useResearchFilter } from "@/context/ResearchFilterContext";

/** Keyword search shown at page top on mobile; hidden on tablet/desktop (see LandingPage.css). */
export function LandingKeywordSearch() {
  const { keywordSearch, setKeywordSearch } = useResearchFilter();

  return (
    <KeywordSearchPanel
      search={keywordSearch}
      onSearchChange={setKeywordSearch}
    />
  );
}
