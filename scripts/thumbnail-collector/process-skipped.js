const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const readline = require("readline");

const CSV_FILE = path.join(__dirname, "targets.csv");
const OUTPUT_DIR = path.join(__dirname, "output");
// Update this if your screenshots are saved to a different folder
const SCREENSHOTS_DIR = path.join(process.env.HOME, "Documents", "Screenshots");

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function escapeCsv(value) {
  const stringValue = value == null ? "" : String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

async function writeCsv(filePath, rows) {
  const headers = ["id", "doi", "url", "status", "image_file", "notes"];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header] || "")).join(","),
    ),
  ];

  await fs.promises.writeFile(filePath, lines.join("\n"), "utf8");
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function buildBaseFilename(doi) {
  return String(doi).replace(/[\/\\?%*:|"<>]/g, "_");
}

function getExtension(fileName) {
  return path.extname(fileName) || ".png";
}

function buildOutputFilename(doi, originalFileName) {
  const baseName = buildBaseFilename(doi);
  const ext = getExtension(originalFileName).toLowerCase();
  return `${baseName}${ext}`;
}

async function snapshotScreenshotFolder() {
  const files = await fs.promises.readdir(SCREENSHOTS_DIR);
  return new Set(files);
}

async function findNewScreenshotFile(beforeFiles, startedAtMs) {
  const files = await fs.promises.readdir(SCREENSHOTS_DIR);
  const candidates = [];

  for (const file of files) {
    if (file.endsWith(".crdownload") || file.endsWith(".part")) continue;
    if (!file.toLowerCase().startsWith("screenshot")) continue;

    const ext = path.extname(file).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;

    const fullPath = path.join(SCREENSHOTS_DIR, file);
    const stat = await fs.promises.stat(fullPath);

    if (!stat.isFile()) continue;

    const isNewFile = !beforeFiles.has(file);
    const isAfterStart = stat.mtimeMs >= startedAtMs;

    if (!isNewFile && !isAfterStart) continue;

    candidates.push({
      file,
      fullPath,
      mtimeMs: stat.mtimeMs,
      isNewFile,
    });
  }

  candidates.sort((a, b) => {
    if (a.isNewFile !== b.isNewFile) {
      return a.isNewFile ? -1 : 1;
    }
    return b.mtimeMs - a.mtimeMs;
  });

  return candidates[0] || null;
}

async function ensureUniqueDestination(destinationPath) {
  const parsed = path.parse(destinationPath);
  let candidate = destinationPath;
  let counter = 1;

  while (true) {
    try {
      await fs.promises.access(candidate);
      candidate = path.join(
        parsed.dir,
        `${parsed.name}_${counter}${parsed.ext}`,
      );
      counter += 1;
    } catch {
      return candidate;
    }
  }
}

async function moveScreenshotToOutput(doi, beforeFiles, startedAtMs) {
  const found = await findNewScreenshotFile(beforeFiles, startedAtMs);

  if (!found) {
    throw new Error("Could not find a new screenshot created for this step.");
  }

  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });

  const renamedFile = buildOutputFilename(doi, found.file);
  const destinationPath = await ensureUniqueDestination(
    path.join(OUTPUT_DIR, renamedFile),
  );

  await fs.promises.rename(found.fullPath, destinationPath);

  return {
    fileName: path.basename(destinationPath),
    outputPath: destinationPath,
    originalFileName: found.file,
  };
}

async function main() {
  const rows = await readCsv(CSV_FILE);
  const skippedRows = rows.filter((row) =>
    ["skip", "skipped"].includes((row.status || "").toLowerCase()),
  );

  console.log(`Skipped rows: ${skippedRows.length}`);

  if (skippedRows.length === 0) {
    console.log("No skipped rows found.");
    return;
  }

  for (let i = 0; i < skippedRows.length; i++) {
    const row = skippedRows[i];

    console.log("\n======================================");
    console.log(`[${i + 1}/${skippedRows.length}]`);
    console.log(`ID   : ${row.id}`);
    console.log(`DOI  : ${row.doi}`);
    console.log(`URL  : ${row.url}`);
    console.log("======================================");
    console.log("Open the page in your browser.");
    console.log("Capture the PDF viewer manually.");
    console.log("Save the screenshot, then return here.");
    console.log("");

    const startedAtMs = Date.now();
    const beforeFiles = await snapshotScreenshotFolder();

    const answer = await ask(
      "Press Enter to move the new screenshot, or type s to skip again, q to quit: ",
    );

    if (answer.toLowerCase() === "q") {
      console.log("Stopped by user.");
      break;
    }

    if (answer.toLowerCase() === "s") {
      row.notes = "Skipped again during manual capture";
      await writeCsv(CSV_FILE, rows);
      console.log("Skipped again.");
      continue;
    }

    try {
      const moved = await moveScreenshotToOutput(
        row.doi,
        beforeFiles,
        startedAtMs,
      );

      row.status = "done_manual_capture";
      row.image_file = moved.fileName;
      row.notes = "";

      await writeCsv(CSV_FILE, rows);

      console.log(`Original file : ${moved.originalFileName}`);
      console.log(`Moved to      : ${moved.outputPath}`);
      console.log(`Saved filename: ${moved.fileName}`);
    } catch (error) {
      row.notes = error.message;
      await writeCsv(CSV_FILE, rows);
      console.log(`Move failed: ${error.message}`);
      console.log("Status remains unchanged.");
    }
  }

  console.log("\nFinished.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
