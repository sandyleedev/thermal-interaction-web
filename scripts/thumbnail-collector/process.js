const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const readline = require("readline");

const CSV_FILE = path.join(__dirname, "targets.csv");
const OUTPUT_DIR = path.join(__dirname, "output");
const DOWNLOADS_DIR = path.join(process.env.HOME, "Downloads");

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
  return path.extname(fileName) || ".jpg";
}

function buildOutputFilename(doi, originalFileName) {
  const baseName = buildBaseFilename(doi);
  const ext = getExtension(originalFileName).toLowerCase();
  return `${baseName}${ext}`;
}

async function findLatestDownloadedImageFile() {
  const files = await fs.promises.readdir(DOWNLOADS_DIR);
  const candidates = [];

  for (const file of files) {
    if (file.endsWith(".crdownload") || file.endsWith(".part")) continue;

    const ext = path.extname(file).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;

    const fullPath = path.join(DOWNLOADS_DIR, file);
    const stat = await fs.promises.stat(fullPath);

    if (!stat.isFile()) continue;

    candidates.push({
      file,
      fullPath,
      mtimeMs: stat.mtimeMs,
    });
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);

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

async function moveDownloadedFileToOutput(doi) {
  const found = await findLatestDownloadedImageFile();

  if (!found) {
    throw new Error(
      "Could not find a recent image file in the Downloads folder.",
    );
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
    originalDownloadedName: found.file,
  };
}

async function main() {
  const rows = await readCsv(CSV_FILE);
  const pendingRows = rows.filter((row) => row.status === "pending");

  if (pendingRows.length === 0) {
    console.log("No pending rows.");
    return;
  }

  console.log(`Pending rows: ${pendingRows.length}`);

  for (let i = 0; i < pendingRows.length; i++) {
    const row = pendingRows[i];

    console.log("\n======================================");
    console.log(`[${i + 1}/${pendingRows.length}]`);
    console.log(`ID   : ${row.id}`);
    console.log(`DOI  : ${row.doi}`);
    console.log(`URL  : ${row.url}`);
    console.log("======================================");
    console.log("Open the page in your browser and navigate to the HTML page.");
    console.log("Then run the console snippet to download the image.");
    console.log("");

    const answer = await ask(
      "Press Enter to move the latest image, or type s to skip, q to quit: ",
    );

    if (answer.toLowerCase() === "q") {
      console.log("Stopped by user.");
      break;
    }

    if (answer.toLowerCase() === "s") {
      row.status = "skip";
      row.notes = "Skipped manually";
      await writeCsv(CSV_FILE, rows);
      console.log("Marked as skip.");
      continue;
    }

    try {
      const moved = await moveDownloadedFileToOutput(row.doi);

      row.status = "done";
      row.image_file = moved.fileName;
      row.notes = "";

      await writeCsv(CSV_FILE, rows);

      console.log(`Original file : ${moved.originalDownloadedName}`);
      console.log(`Moved to      : ${moved.outputPath}`);
      console.log(`Saved filename: ${moved.fileName}`);
    } catch (error) {
      row.notes = error.message;
      await writeCsv(CSV_FILE, rows);
      console.log(`Move failed: ${error.message}`);
      console.log("Status remains pending.");
    }
  }

  console.log("\nFinished.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
