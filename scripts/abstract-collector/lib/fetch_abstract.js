const REQUEST_DELAY_MS = 300;

const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normaliseDoi = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();

const isValidDoi = (doi) => DOI_PATTERN.test(doi);

const repairMojibake = (value) =>
  String(value ?? "")
    .replace(/‚Äô/g, "’")
    .replace(/‚Äò/g, "‘")
    .replace(/‚Äú/g, "“")
    .replace(/‚Äù/g, "”")
    .replace(/‚Äì/g, "–")
    .replace(/‚Äî/g, "—")
    .replace(/‚Ä¶/g, "…")
    .replace(/¬†/g, " ")
    .replace(/Â /g, " ")
    .replace(/Â/g, "")
    .replace(/â€™/g, "’")
    .replace(/â€˜/g, "‘")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€¦/g, "…")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const stripTags = (value) =>
  repairMojibake(
    String(value ?? "")
      .replace(/<\/?jats:[^>]+>/g, " ")
      .replace(/<[^>]+>/g, " "),
  );

const invertedIndexToText = (index) => {
  if (!index) return "";

  const words = [];

  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      words.push({ word, position });
    }
  }

  return repairMojibake(
    words
      .sort((a, b) => a.position - b.position)
      .map(({ word }) => word)
      .join(" "),
  );
};

const fetchFromCrossref = async (doi) => {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const response = await fetch(url);

  if (!response.ok) return { title: "", abstract: "" };

  const data = await response.json();
  const message = data?.message ?? {};

  const title = Array.isArray(message.title) ? (message.title[0] ?? "") : "";
  const abstract = message.abstract ? stripTags(message.abstract) : "";

  return {
    title: repairMojibake(title),
    abstract,
  };
};

const fetchFromOpenAlex = async (doi) => {
  const url = `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`;
  const response = await fetch(url);

  if (!response.ok) return { title: "", abstract: "" };

  const data = await response.json();

  return {
    title: repairMojibake(data?.title ?? ""),
    abstract: invertedIndexToText(data?.abstract_inverted_index),
  };
};

const collectAbstract = async (doi) => {
  if (!isValidDoi(doi)) {
    return {
      doi,
      title: "",
      abstract: "",
      source: "",
      status: "invalid-doi",
      warning: "Invalid DOI format.",
    };
  }

  try {
    const crossref = await fetchFromCrossref(doi);
    await delay(REQUEST_DELAY_MS);

    if (crossref.abstract) {
      return {
        doi,
        title: crossref.title,
        abstract: crossref.abstract,
        source: "crossref",
        status: "found",
        warning: "",
      };
    }

    const openalex = await fetchFromOpenAlex(doi);
    await delay(REQUEST_DELAY_MS);

    if (openalex.abstract) {
      return {
        doi,
        title: openalex.title || crossref.title,
        abstract: openalex.abstract,
        source: "openalex",
        status: "found",
        warning: "",
      };
    }

    return {
      doi,
      title: crossref.title || openalex.title,
      abstract: "",
      source: "",
      status: "not-found",
      warning: "No abstract found from Crossref or OpenAlex.",
    };
  } catch (error) {
    return {
      doi,
      title: "",
      abstract: "",
      source: "",
      status: "failed",
      warning: error instanceof Error ? error.message : String(error),
    };
  }
};

const hasAbstractText = (value) =>
  String(value ?? "").trim() !== "";

module.exports = {
  REQUEST_DELAY_MS,
  normaliseDoi,
  isValidDoi,
  repairMojibake,
  collectAbstract,
  hasAbstractText,
};
