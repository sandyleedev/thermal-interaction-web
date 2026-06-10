const fs = require("node:fs/promises");
const path = require("node:path");
const {
  CSV_COLUMNS,
  ARRAY_FIELDS,
  NUMBER_FIELDS,
} = require("./helper/column_mapping");
const { parseSenses } = require("./helper/sense_mapping");
const {
  parseMaterialsInContactWithSkin,
} = require("./helper/material_mapping");
const {
  parseThermalTransferModes,
} = require("./helper/thermal_transfer_mode_mapping");

const INPUT_DIR = "scripts/research-paper-converter/input";

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

const DEFAULT_OUTPUT_PATH =
  "scripts/research-paper-converter/output/researchPapers.json";

const EXISTING_JSON_PATH = "src/data/researchPapers.json";

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
    .trim();

const normaliseDoi = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();

const normaliseColumnName = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim()
    .toLowerCase();

const normaliseColumnNameLoose = (value) =>
  normaliseColumnName(value).replace(/[^a-z0-9]/g, "");

const isEmptyValue = (value) => {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return (
    text === "" ||
    text === "n/a" ||
    text === "na" ||
    text === "n.a." ||
    text === "null" ||
    text === "none" ||
    text === "unknown" ||
    text === "unclear" ||
    text === "not specified" ||
    text === "not reported" ||
    text === "not applicable" ||
    text === "not available" ||
    text === "no report" ||
    text === "no specific report"
  );
};

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
      if (char === "\r" && nextChar === "\n") i += 1;

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

const parseNumber = (value) => {
  if (isEmptyValue(value)) return null;

  const cleaned = String(value).trim().replace(",", ".");
  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
};

const parseArray = (value) => {
  if (isEmptyValue(value)) return [];

  return String(value)
    .split(/[;\n]/)
    .map((item) => parseString(item))
    .filter(Boolean);
};

const parseString = (value) => {
  if (isEmptyValue(value)) return null;
  return repairMojibake(value);
};

const normaliseBodySiteValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-");

const toKebabCase = (value) =>
  normaliseBodySiteValue(value).replace(/[()]/g, "").replace(/\s+/g, "-");

const parseSide = (value) => {
  const text = normaliseBodySiteValue(value);

  if (text === "left") return "left";
  if (text === "right") return "right";

  return null;
};

const parseBodySiteItem = (item, context = {}) => {
  const match = item.match(/^(.*?)\s*\((.*?)\)\s*$/);

  const bodyPartText = match ? match[1].trim() : item.trim();
  const sideText = match ? match[2].trim() : "";

  const [regionRaw, subregionRaw] = bodyPartText
    .split(">")
    .map((part) => part.trim());

  const region = toKebabCase(regionRaw);
  const subregion = subregionRaw ? toKebabCase(subregionRaw) : "general";
  const side = sideText ? parseSide(sideText) : null;

  if (sideText && !side) {
    const paperLabel = [context.doi, context.title].filter(Boolean).join(" / ");

    console.warn(
      `[WARN] Invalid body side${
        paperLabel ? ` (${paperLabel})` : ""
      }: "${sideText}". Only "left" and "right" are supported.`,
    );
  }

  if (!region || region === "n-a" || region === "not-specified") {
    return null;
  }

  return {
    region,
    subregion: subregion || "general",
    side,
  };
};

const parseBodySites = (value, context = {}) => {
  if (isEmptyValue(value)) return [];

  const text = String(value ?? "").trim();

  if (
    text.toLowerCase() === "n/a" ||
    text.toLowerCase() === "na" ||
    text.toLowerCase() === "not specified"
  ) {
    return [];
  }

  return text
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => parseBodySiteItem(item, context))
    .filter(Boolean);
};

const createColumnResolver = (headers) => {
  const exactMap = new Map();
  const normalisedMap = new Map();
  const looseMap = new Map();

  headers.forEach((header) => {
    exactMap.set(header, header);
    normalisedMap.set(normaliseColumnName(header), header);
    looseMap.set(normaliseColumnNameLoose(header), header);
  });

  return (expectedColumnName) => {
    if (!expectedColumnName) return null;

    if (exactMap.has(expectedColumnName)) {
      return exactMap.get(expectedColumnName);
    }

    const normalisedExpected = normaliseColumnName(expectedColumnName);
    if (normalisedMap.has(normalisedExpected)) {
      return normalisedMap.get(normalisedExpected);
    }

    const looseExpected = normaliseColumnNameLoose(expectedColumnName);
    if (looseMap.has(looseExpected)) {
      return looseMap.get(looseExpected);
    }

    return null;
  };
};

let resolveColumnName = null;

const getValue = (row, jsonKey) => {
  const columnConfig = CSV_COLUMNS[jsonKey];

  if (!columnConfig || !resolveColumnName) return undefined;

  const candidateColumns = Array.isArray(columnConfig)
    ? columnConfig
    : [columnConfig];

  for (const expectedColumnName of candidateColumns) {
    const actualColumnName = resolveColumnName(expectedColumnName);

    if (!actualColumnName) continue;

    const value = row[actualColumnName];

    if (!isEmptyValue(value)) {
      return value;
    }
  }

  return undefined;
};

const resolvePublicationSortDate = (row) => {
  const explicit = parseString(getValue(row, "publicationSortDate"));
  if (explicit) return explicit;

  const year = parseNumber(getValue(row, "publicationYear"));
  if (year != null) {
    return `${Math.trunc(year)}-01-01`;
  }

  return "0000-01-01";
};

const convertRowToPaper = (row, id) => ({
  id: String(id),

  title: parseString(getValue(row, "title")),
  authors: parseString(getValue(row, "authors")),
  publicationYear: parseNumber(getValue(row, "publicationYear")),
  publicationSortDate: resolvePublicationSortDate(row),
  publicationVenue: parseString(getValue(row, "publicationVenue")),
  doi: normaliseDoi(getValue(row, "doi")),
  url: parseString(getValue(row, "url")),

  abstract: parseString(getValue(row, "abstract")),

  temperatureNotes: parseString(getValue(row, "temperatureNotes")),
  ambientTempC: parseNumber(getValue(row, "ambientTempC")),
  minTempC: parseNumber(getValue(row, "minTempC")),
  maxTempC: parseNumber(getValue(row, "maxTempC")),

  durationNotes: parseString(getValue(row, "durationNotes")),
  minDurationSec: parseNumber(getValue(row, "minDurationSec")),
  maxDurationSec: parseNumber(getValue(row, "maxDurationSec")),

  senses: parseSenses(getValue(row, "senses"), {
    doi: normaliseDoi(getValue(row, "doi")),
    title: parseString(getValue(row, "title")),
  }),
  thermalPerceptionMeasure: parseString(
    getValue(row, "thermalPerceptionMeasure"),
  ),
  thermalCuePurpose: parseString(getValue(row, "thermalCuePurpose")),
  thermalTransferModes: parseThermalTransferModes(
    getValue(row, "thermalTransferModes"),
    {
      doi: normaliseDoi(getValue(row, "doi")),
      title: parseString(getValue(row, "title")),
    },
  ),

  mainActuatorForTemperatureSensation: parseString(
    getValue(row, "mainActuatorForTemperatureSensation"),
  ),
  mainActuatorModel: parseString(getValue(row, "mainActuatorModel")),
  mainActuatorSize: parseString(getValue(row, "mainActuatorSize")),
  overallDeviceSize: parseString(getValue(row, "overallDeviceSize")),
  mainActuatorPossibleTemperatureRange: parseString(
    getValue(row, "mainActuatorPossibleTemperatureRange"),
  ),
  otherSensoryActuators: parseArray(getValue(row, "otherSensoryActuators")),
  auxiliaryHardware: parseArray(getValue(row, "auxiliaryHardware")),
  heatControlMethod: parseString(getValue(row, "heatControlMethod")),
  powerConsumption: parseString(getValue(row, "powerConsumption")),
  temporalParameters: parseString(getValue(row, "temporalParameters")),
  otherNote: parseString(getValue(row, "otherNote")),

  bodyPartsInvolved: parseString(getValue(row, "bodyPartsInvolved")),
  bodySites: parseBodySites(getValue(row, "bodySites"), {
    doi: normaliseDoi(getValue(row, "doi")),
    title: parseString(getValue(row, "title")),
  }),

  powerEnergyConsumption: parseString(getValue(row, "powerEnergyConsumption")),
  materialsInContactWithSkinNotes: parseString(
    getValue(row, "materialsInContactWithSkinNotes"),
  ),
  materialsInContactWithSkin: parseMaterialsInContactWithSkin(
    getValue(row, "materialsInContactWithSkin"),
    {
      doi: normaliseDoi(getValue(row, "doi")),
      title: parseString(getValue(row, "title")),
    },
  ),
});

const readExistingJsonByDoi = async () => {
  try {
    const content = await fs.readFile(EXISTING_JSON_PATH, "utf-8");
    const papers = JSON.parse(content);

    return new Map(
      papers
        .filter((paper) => paper.doi)
        .map((paper) => [normaliseDoi(paper.doi), paper]),
    );
  } catch {
    return new Map();
  }
};

const getNextId = (existingByDoi) =>
  Math.max(
    0,
    ...Array.from(existingByDoi.values()).map((paper) => Number(paper.id) || 0),
  ) + 1;

const sortByIdAsc = (papers) =>
  papers.sort((a, b) => {
    const idA = Number(a.id);
    const idB = Number(b.id);

    if (Number.isFinite(idA) && Number.isFinite(idB)) {
      return idA - idB;
    }

    return String(a.id).localeCompare(String(b.id));
  });

const main = async () => {
  const inputPath = process.argv[2] ?? (await findSingleCsvInputFile());
  const outputPath = process.argv[3] ?? DEFAULT_OUTPUT_PATH;

  const content = await fs.readFile(inputPath, "utf-8");
  const { headers, rows } = parseCsv(content);

  resolveColumnName = createColumnResolver(headers);

  const existingByDoi = await readExistingJsonByDoi();

  const missingColumns = Object.entries(CSV_COLUMNS)
    .filter(([, columnConfig]) => {
      const candidateColumns = Array.isArray(columnConfig)
        ? columnConfig
        : [columnConfig];

      return !candidateColumns.some((column) => resolveColumnName(column));
    })
    .map(([jsonKey, columnConfig]) => ({
      jsonKey,
      expectedColumns: Array.isArray(columnConfig)
        ? columnConfig
        : [columnConfig],
    }));

  if (missingColumns.length > 0) {
    console.warn("⚠️ Missing mapped CSV columns:");
    missingColumns.forEach(({ jsonKey, expectedColumns }) => {
      console.warn(`- ${jsonKey}: ${expectedColumns.join(" OR ")}`);
    });
  }

  const papers = [];
  const seenDois = new Set();

  let skippedRows = 0;
  let duplicateRows = 0;
  let existingCount = 0;
  let newCount = 0;
  let nextId = getNextId(existingByDoi);

  rows.forEach((row, index) => {
    const doi = normaliseDoi(getValue(row, "doi"));

    if (!doi) {
      skippedRows += 1;
      console.warn(`⚠️ [WARN] Row ${index + 2}: missing DOI. Skipped.`);
      return;
    }

    if (seenDois.has(doi)) {
      duplicateRows += 1;
      skippedRows += 1;
      console.warn(
        `⚠️ [WARN] Row ${index + 2}: duplicate DOI "${doi}". Skipped.`,
      );
      return;
    }

    seenDois.add(doi);

    const existingPaper = existingByDoi.get(doi);

    const paper = convertRowToPaper(row, existingPaper?.id ?? nextId);

    if (existingPaper?.id) {
      paper.id = existingPaper.id;
      existingCount += 1;
    } else {
      paper.id = String(nextId);
      nextId += 1;
      newCount += 1;
    }

    papers.push(paper);
  });

  sortByIdAsc(papers);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(papers, null, 2), "utf-8");

  console.log("✅ Done.");
  console.log(`🔍 Input rows: ${rows.length}`);
  console.log(`🔍 Existing papers updated/kept by DOI: ${existingCount}`);
  console.log(`🔍 New papers assigned new ids: ${newCount}`);
  console.log(`🔍 Papers converted: ${papers.length}`);
  console.log(`🔍 Rows skipped: ${skippedRows}`);
  console.log(`🔍 Duplicate DOI rows skipped: ${duplicateRows}`);
  console.log(`🔍 Output: ${outputPath}`);
};

main();
