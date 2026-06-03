import {
  formatBodySiteLine,
  formatPaperDisplay,
  titleCaseOption,
} from "@/lib/research/formatPaperDisplay";
import {
  normalizeBodySites,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

export const KEYWORD_SEARCH_FIELD_OPTIONS = [
  { id: "all", label: "All fields" },
  { id: "title", label: "Title" },
  { id: "authors", label: "Authors" },
  { id: "publication", label: "Publication" },
  { id: "details", label: "Paper details" },
] as const;

export type KeywordSearchField =
  (typeof KEYWORD_SEARCH_FIELD_OPTIONS)[number]["id"];

export type KeywordSearchQuery = {
  query: string;
  field: KeywordSearchField;
};

export const DEFAULT_KEYWORD_SEARCH: KeywordSearchQuery = {
  query: "",
  field: "all",
};

function pushText(
  parts: string[],
  value: string | number | null | undefined,
): void {
  if (value == null) return;
  const s = String(value).trim();
  if (s) parts.push(s);
}

function pushList(
  parts: string[],
  items: readonly string[] | undefined,
  transform?: (s: string) => string,
): void {
  for (const item of items ?? []) {
    const s = item.trim();
    if (!s) continue;
    parts.push(transform ? transform(s) : s);
  }
}

function buildTitleSearchText(paper: ResearchPaper): string {
  return paper.title.trim();
}

function buildAuthorsSearchText(paper: ResearchPaper): string {
  return paper.authors?.trim() ?? "";
}

function buildPublicationSearchText(paper: ResearchPaper): string {
  const parts: string[] = [];
  pushText(parts, paper.publicationYear);
  pushText(parts, paper.publicationVenue);
  pushText(parts, paper.doi);
  pushText(parts, paper.url);
  return parts.join("\n");
}

function buildPaperDetailsSearchText(paper: ResearchPaper): string {
  const display = formatPaperDisplay(paper);
  const parts: string[] = [];

  pushText(parts, paper.ambientTempC);
  pushText(parts, paper.minTempC);
  pushText(parts, paper.maxTempC);
  pushText(parts, paper.minDurationSec);
  pushText(parts, paper.maxDurationSec);
  pushList(parts, paper.senses, titleCaseOption);
  pushList(parts, paper.materialsInContactWithSkin, titleCaseOption);
  pushList(parts, paper.thermalTransferModes, titleCaseOption);
  pushText(parts, display.temperatureRange);
  pushText(parts, display.duration);
  pushText(parts, display.transferMode);

  pushText(parts, paper.bodyPartsInvolved);
  for (const site of normalizeBodySites(paper)) {
    pushText(parts, formatBodySiteLine(site));
    pushText(parts, site.region);
    pushText(parts, site.subregion);
    pushText(parts, site.side ?? undefined);
  }

  pushText(parts, paper.mainActuatorForTemperatureSensation);
  pushText(parts, paper.mainActuatorModel);
  pushText(parts, paper.mainActuatorSize);
  pushText(parts, paper.overallDeviceSize);
  pushText(parts, paper.mainActuatorPossibleTemperatureRange);
  pushText(parts, paper.heatControlMethod);
  pushText(parts, paper.powerConsumption);
  pushText(parts, paper.temporalParameters);
  pushText(parts, paper.powerEnergyConsumption);
  pushList(parts, paper.otherSensoryActuators);
  pushList(parts, paper.auxiliaryHardware);

  pushText(parts, paper.thermalPerceptionMeasure);
  pushText(parts, paper.thermalCuePurpose);
  pushText(parts, paper.technicalSummary);
  pushText(parts, paper.otherNote);
  pushList(parts, display.keywords);

  return parts.join("\n");
}

/**
 * Concatenate every searchable field from a paper (detail page content included).
 */
export function buildPaperSearchText(paper: ResearchPaper): string {
  const parts: string[] = [];
  pushText(parts, paper.id);
  parts.push(buildTitleSearchText(paper));
  parts.push(buildAuthorsSearchText(paper));
  parts.push(buildPublicationSearchText(paper));
  parts.push(buildPaperDetailsSearchText(paper));
  return parts.join("\n").toLowerCase();
}

export function buildPaperSearchTextForField(
  paper: ResearchPaper,
  field: KeywordSearchField,
): string {
  if (field === "all") return buildPaperSearchText(paper);

  let raw = "";
  switch (field) {
    case "title":
      raw = buildTitleSearchText(paper);
      break;
    case "authors":
      raw = buildAuthorsSearchText(paper);
      break;
    case "publication":
      raw = buildPublicationSearchText(paper);
      break;
    case "details":
      raw = buildPaperDetailsSearchText(paper);
      break;
  }
  return raw.toLowerCase();
}

export function parseKeywordQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function paperMatchesKeywordQuery(
  paper: ResearchPaper,
  search: KeywordSearchQuery,
  searchText?: string,
): boolean {
  const terms = parseKeywordQuery(search.query);
  if (terms.length === 0) return true;
  const haystack =
    searchText ?? buildPaperSearchTextForField(paper, search.field);
  return terms.every((term) => haystack.includes(term));
}

export function filterPapersByKeyword(
  papers: readonly ResearchPaper[],
  search: KeywordSearchQuery,
): ResearchPaper[] {
  const terms = parseKeywordQuery(search.query);
  if (terms.length === 0) return [...papers];
  return papers.filter((paper) => {
    const haystack = buildPaperSearchTextForField(paper, search.field);
    return terms.every((term) => haystack.includes(term));
  });
}

export function keywordSearchFieldLabel(field: KeywordSearchField): string {
  return (
    KEYWORD_SEARCH_FIELD_OPTIONS.find((option) => option.id === field)?.label ??
    "All fields"
  );
}

export function hasActiveKeywordSearch(search: KeywordSearchQuery): boolean {
  return search.query.trim().length > 0;
}
