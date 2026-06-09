// scripts/abstract-collector/collect_abstracts_from_csv.js

const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_INPUT_PATH = "scripts/abstract-collector/input/papers.csv";
const OUTPUT_FULL_CSV_PATH =
  "scripts/abstract-collector/output/papers-with-abstracts.csv";
const OUTPUT_ABSTRACTS_ONLY_PATH =
  "scripts/abstract-collector/output/abstracts-from-csv.csv";

const REQUEST_DELAY_MS = 300;

const DOI_COLUMN_CANDIDATES = new Set(["doi", "DOI"]);

const ABSTRACT_COLUMN_CANDIDATES = new Set(["abstract", "Abstract"]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normaliseDoi = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();

const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

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
    .replace(/\s+/g, " ")
    .trim();

const stripTags = (value) =>
  repairMojibake(
    String(value ?? "")
      .replace(/<\/?jats:[^>]+>/g, " ")
      .replace(/<[^>]+>/g, " "),
  );

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let current = "";
  let insideQuotes = false;

  const text = content.replace(/^\uFEFF/, "");

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }

      row.push(current);

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);

  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((header) => repairMojibake(header.trim()));

  const parsedRows = rows.slice(1).map((values) => {
    const parsedRow = {};

    headers.forEach((header, index) => {
      parsedRow[header] = repairMojibake(values[index] ?? "");
    });

    return parsedRow;
  });

  return { headers, rows: parsedRows };
};

const findColumn = (headers, candidates) =>
  headers.find((header) => candidates.has(header.trim().toLowerCase())) ?? null;

const findDoiColumn = (headers) => findColumn(headers, DOI_COLUMN_CANDIDATES);

const findAbstractColumn = (headers) =>
  findColumn(headers, ABSTRACT_COLUMN_CANDIDATES);

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

const ensureColumns = (headers, requiredColumns) => {
  const nextHeaders = [...headers];

  for (const column of requiredColumns) {
    if (!nextHeaders.includes(column)) {
      nextHeaders.push(column);
    }
  }

  return nextHeaders;
};

const writeCsv = async (outputPath, headers, rows) => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(","),
    ),
  ];

  await fs.writeFile(outputPath, `\uFEFF${lines.join("\n")}`, "utf-8");
};

const main = async () => {
  const args = process.argv.slice(2);
  const overwrite = args.includes("--overwrite");
  const inputPath =
    args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_INPUT_PATH;

  const content = await fs.readFile(inputPath, "utf-8");
  const { headers, rows } = parseCsv(content);

  if (rows.length === 0) {
    console.error("The CSV file is empty.");
    process.exit(1);
  }

  const doiColumn = findDoiColumn(headers);

  if (!doiColumn) {
    console.error(
      `Could not find DOI column. Available columns: ${headers.join(", ")}`,
    );
    process.exit(1);
  }

  const existingAbstractColumn = findAbstractColumn(headers);
  const abstractColumn = existingAbstractColumn ?? "Abstract";
  const outputHeaders = ensureColumns(headers, [abstractColumn]);

  const uniqueDois = Array.from(
    new Set(rows.map((row) => normaliseDoi(row[doiColumn])).filter(Boolean)),
  );

  console.log(`Input file: ${inputPath}`);
  console.log(`Detected DOI column: ${doiColumn}`);
  console.log(
    `Detected Abstract column: ${existingAbstractColumn ?? "none, will add Abstract"}`,
  );
  console.log(`Rows read: ${rows.length}`);
  console.log(`Unique DOIs: ${uniqueDois.length}`);
  console.log(`Overwrite existing abstracts: ${overwrite ? "yes" : "no"}`);

  const abstractByDoi = new Map();

  for (const [index, doi] of uniqueDois.entries()) {
    console.log(`[${index + 1}/${uniqueDois.length}] Fetching ${doi}`);
    const result = await collectAbstract(doi);
    abstractByDoi.set(doi, result);

    if (result.status !== "found") {
      console.warn(`[WARN] ${doi}: ${result.status} - ${result.warning}`);
    }
  }

  let filledCount = 0;
  let preservedCount = 0;
  let emptyCount = 0;
  let missingDoiCount = 0;

  const updatedRows = rows.map((row, index) => {
    const nextRow = { ...row };
    const doi = normaliseDoi(row[doiColumn]);
    const result = abstractByDoi.get(doi);

    const existingAbstract = repairMojibake(nextRow[abstractColumn] ?? "");
    const hasExistingAbstract = existingAbstract.trim() !== "";

    if (!doi) {
      missingDoiCount += 1;
      nextRow[abstractColumn] = existingAbstract;
      console.warn(
        `[WARN] Row ${index + 2}: missing DOI. Abstract left blank/preserved.`,
      );
      return nextRow;
    }

    if (hasExistingAbstract && !overwrite) {
      preservedCount += 1;
      nextRow[abstractColumn] = existingAbstract;
      return nextRow;
    }

    if (result?.status === "found") {
      filledCount += 1;
      nextRow[abstractColumn] = result.abstract;
      return nextRow;
    }

    emptyCount += 1;
    nextRow[abstractColumn] = existingAbstract;
    return nextRow;
  });

  await writeCsv(OUTPUT_FULL_CSV_PATH, outputHeaders, updatedRows);

  const abstractsOnlyHeaders = [
    "doi",
    "title",
    "abstract",
    "source",
    "status",
    "warning",
  ];

  const abstractsOnlyRows = Array.from(abstractByDoi.values()).map(
    (result) => ({
      doi: result.doi,
      title: result.title,
      abstract: result.abstract,
      source: result.source,
      status: result.status,
      warning: result.warning,
    }),
  );

  await writeCsv(
    OUTPUT_ABSTRACTS_ONLY_PATH,
    abstractsOnlyHeaders,
    abstractsOnlyRows,
  );

  const results = Array.from(abstractByDoi.values());

  console.log("Done.");
  console.log(
    `Found from APIs: ${results.filter((result) => result.status === "found").length}`,
  );
  console.log(
    `Not found: ${results.filter((result) => result.status === "not-found").length}`,
  );
  console.log(
    `Invalid DOI: ${results.filter((result) => result.status === "invalid-doi").length}`,
  );
  console.log(
    `Failed: ${results.filter((result) => result.status === "failed").length}`,
  );
  console.log(`Rows filled with abstract: ${filledCount}`);
  console.log(`Rows preserved existing abstract: ${preservedCount}`);
  console.log(`Rows left empty: ${emptyCount}`);
  console.log(`Full CSV output: ${OUTPUT_FULL_CSV_PATH}`);
  console.log(`Abstracts only output: ${OUTPUT_ABSTRACTS_ONLY_PATH}`);
};

main();
