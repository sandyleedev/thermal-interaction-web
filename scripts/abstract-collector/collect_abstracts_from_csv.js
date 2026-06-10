const fs = require("node:fs/promises");
const path = require("node:path");
const {
  collectAbstract,
  hasAbstractText,
  normaliseDoi,
  repairMojibake,
} = require("./lib/fetch_abstract");

const INPUT_DIR = "scripts/abstract-collector/input";
const OUTPUT_FULL_CSV_PATH =
  "scripts/abstract-collector/output/papers-with-abstracts.csv";

const DOI_COLUMN_CANDIDATES = new Set(["doi"]);
const ABSTRACT_COLUMN_CANDIDATES = new Set(["abstract"]);

const findSingleCsvInputFile = async () => {
  const files = await fs.readdir(INPUT_DIR);

  const csvFiles = files.filter((file) => file.toLowerCase().endsWith(".csv"));

  if (csvFiles.length === 0) {
    throw new Error(
      [
        `No CSV file was found in:`,
        `  ${INPUT_DIR}`,
        ``,
        `Please add one CSV file to this folder, then run the script again.`,
      ].join("\n"),
    );
  }

  if (csvFiles.length > 1) {
    throw new Error(
      [
        `More than one CSV file was found in:`,
        `  ${INPUT_DIR}`,
        ``,
        `Please keep only one CSV file in this folder, then run the script again.`,
        ``,
        `Found files:`,
        ...csvFiles.map((file) => `  - ${file}`),
      ].join("\n"),
    );
  }

  return path.join(INPUT_DIR, csvFiles[0]);
};

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

const printSummary = ({
  results,
  filledCount,
  preservedCount,
  emptyCount,
  missingDoiCount,
}) => {
  const foundResults = results.filter((result) => result.status === "found");
  const notFoundResults = results.filter(
    (result) => result.status === "not-found",
  );
  const invalidDoiResults = results.filter(
    (result) => result.status === "invalid-doi",
  );
  const failedResults = results.filter((result) => result.status === "failed");

  const warningResults = [
    ...notFoundResults,
    ...invalidDoiResults,
    ...failedResults,
  ];

  console.log("");
  console.log("========================================");
  console.log("📊 Abstract Collection Summary");
  console.log("========================================");
  console.log(`✅ Found from APIs: ${foundResults.length}`);
  console.log(`❌ Not found: ${notFoundResults.length}`);
  console.log(`❌ Invalid DOI: ${invalidDoiResults.length}`);
  console.log(`❌ Failed: ${failedResults.length}`);
  console.log("----------------------------------------");
  console.log(`✅ Rows filled with abstract: ${filledCount}`);
  console.log(`🔒 Rows preserved existing abstract: ${preservedCount}`);
  console.log(`⚠️ Rows left empty: ${emptyCount}`);
  console.log(`⚠️ Rows missing DOI: ${missingDoiCount}`);
  console.log("----------------------------------------");
  console.log(`📄 Full CSV output: ${OUTPUT_FULL_CSV_PATH}`);
  console.log("========================================");

  if (warningResults.length === 0 && missingDoiCount === 0) {
    console.log("");
    console.log("✅ No missing abstracts or DOI issues found.");
    return;
  }

  console.log("");
  console.log("========================================");
  console.log("⚠️ Items Requiring Review");
  console.log("========================================");

  warningResults.forEach((result) => {
    console.log(`- DOI: ${result.doi}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Warning: ${result.warning || "No additional warning."}`);

    if (result.title) {
      console.log(`  Title: ${result.title}`);
    }
  });

  if (missingDoiCount > 0) {
    console.log(`- ${missingDoiCount} row(s) had no DOI.`);
    console.log("  Check the terminal warnings above for row numbers.");
  }

  console.log("========================================");
};

const main = async () => {
  const inputPath = process.argv[2] ?? (await findSingleCsvInputFile());
  const content = await fs.readFile(inputPath, "utf-8");
  const { headers, rows } = parseCsv(content);

  if (rows.length === 0) {
    throw new Error("The CSV file is empty.");
  }

  const doiColumn = findDoiColumn(headers);

  if (!doiColumn) {
    throw new Error(
      `Could not find DOI column. Available columns: ${headers.join(", ")}`,
    );
  }

  const existingAbstractColumn = findAbstractColumn(headers);
  const abstractColumn = existingAbstractColumn ?? "Abstract";
  const outputHeaders = ensureColumns(headers, [abstractColumn]);

  const doisToFetch = Array.from(
    new Set(
      rows
        .filter((row) => {
          const doi = normaliseDoi(row[doiColumn]);
          if (!doi) return false;

          return !hasAbstractText(row[abstractColumn]);
        })
        .map((row) => normaliseDoi(row[doiColumn])),
    ),
  );

  console.log("========================================");
  console.log("🔍 Abstract Collector");
  console.log("========================================");
  console.log(`Input file: ${inputPath}`);
  console.log(`Detected DOI column: ${doiColumn}`);
  console.log(
    `Detected Abstract column: ${
      existingAbstractColumn ?? "none, will add Abstract"
    }`,
  );
  console.log(`Rows read: ${rows.length}`);
  console.log(`DOIs to fetch: ${doisToFetch.length}`);
  console.log("========================================");

  const abstractByDoi = new Map();

  for (const [index, doi] of doisToFetch.entries()) {
    console.log(`⏳ [${index + 1}/${doisToFetch.length}] Fetching ${doi}`);
    const result = await collectAbstract(doi);
    abstractByDoi.set(doi, result);

    if (result.status !== "found") {
      console.warn(`⚠️ [WARN] ${doi}: ${result.status} - ${result.warning}`);
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

    if (!doi) {
      missingDoiCount += 1;
      nextRow[abstractColumn] = existingAbstract;
      console.warn(
        `⚠️ [WARN] Row ${index + 2}: missing DOI. Abstract left blank/preserved.`,
      );
      return nextRow;
    }

    if (hasAbstractText(existingAbstract)) {
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

  const results = Array.from(abstractByDoi.values());

  console.log("");
  console.log("✅ Done.");

  printSummary({
    results,
    filledCount,
    preservedCount,
    emptyCount,
    missingDoiCount,
  });
};

main().catch((error) => {
  console.error("");
  console.error("========================================");
  console.error("❌ Failed to collect abstracts");
  console.error("========================================");
  console.error(error instanceof Error ? error.message : String(error));
  console.error("========================================");
  process.exit(1);
});
