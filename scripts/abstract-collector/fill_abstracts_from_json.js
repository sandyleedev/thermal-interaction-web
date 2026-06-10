const fs = require("node:fs/promises");
const path = require("node:path");
const {
  collectAbstract,
  hasAbstractText,
  normaliseDoi,
} = require("./lib/fetch_abstract");

const DEFAULT_JSON_PATH = "frontend/src/data/researchPapers.json";

const parseCliArgs = (argv) => {
  const args = argv.slice(2);

  let inputPath = DEFAULT_JSON_PATH;
  const inputFlagIndex = args.indexOf("--input");
  if (inputFlagIndex !== -1) {
    const candidate = args[inputFlagIndex + 1];
    if (!candidate || candidate.startsWith("--")) {
      throw new Error("--input requires a file path.");
    }
    inputPath = candidate;
  }

  let outputPath = inputPath;
  const outputFlagIndex = args.indexOf("--output");
  if (outputFlagIndex !== -1) {
    const candidate = args[outputFlagIndex + 1];
    if (!candidate || candidate.startsWith("--")) {
      throw new Error("--output requires a file path.");
    }
    outputPath = candidate;
  }

  const positional = args.filter(
    (arg, index) =>
      !arg.startsWith("--") &&
      !(inputFlagIndex !== -1 && index === inputFlagIndex + 1) &&
      !(outputFlagIndex !== -1 && index === outputFlagIndex + 1),
  );

  if (positional[0]) {
    inputPath = positional[0];
  }
  if (positional[1]) {
    outputPath = positional[1];
  }

  return { inputPath, outputPath };
};

const printSummary = ({ results, filledCount, skippedCount, missingDoiCount }) => {
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
  console.log("📊 Abstract Fill Summary");
  console.log("========================================");
  console.log(`✅ Found from APIs: ${foundResults.length}`);
  console.log(`❌ Not found: ${notFoundResults.length}`);
  console.log(`❌ Invalid DOI: ${invalidDoiResults.length}`);
  console.log(`❌ Failed: ${failedResults.length}`);
  console.log("----------------------------------------");
  console.log(`✅ Papers filled with abstract: ${filledCount}`);
  console.log(`🔒 Papers skipped (already had abstract): ${skippedCount}`);
  console.log(`⚠️ Papers missing DOI: ${missingDoiCount}`);
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
    console.log(`- ${missingDoiCount} paper(s) had no DOI.`);
  }

  console.log("========================================");
};

const main = async () => {
  const { inputPath, outputPath } = parseCliArgs(process.argv);
  const content = await fs.readFile(inputPath, "utf-8");
  const papers = JSON.parse(content);

  if (!Array.isArray(papers)) {
    throw new Error(`Expected a JSON array in ${inputPath}`);
  }

  const papersToFetch = papers.filter(
    (paper) => !hasAbstractText(paper.abstract) && normaliseDoi(paper.doi),
  );

  const uniqueDois = Array.from(
    new Set(papersToFetch.map((paper) => normaliseDoi(paper.doi))),
  );

  const missingDoiCount = papers.filter(
    (paper) => !hasAbstractText(paper.abstract) && !normaliseDoi(paper.doi),
  ).length;

  console.log("========================================");
  console.log("🔍 Fill Abstracts from JSON");
  console.log("========================================");
  console.log(`Input file: ${inputPath}`);
  console.log(`Output file: ${outputPath}`);
  console.log(`Total papers: ${papers.length}`);
  console.log(`Papers missing abstract: ${papersToFetch.length}`);
  console.log(`Unique DOIs to fetch: ${uniqueDois.length}`);
  console.log("========================================");

  const abstractByDoi = new Map();

  for (const [index, doi] of uniqueDois.entries()) {
    console.log(`⏳ [${index + 1}/${uniqueDois.length}] Fetching ${doi}`);
    const result = await collectAbstract(doi);
    abstractByDoi.set(doi, result);

    if (result.status !== "found") {
      console.warn(`⚠️ [WARN] ${doi}: ${result.status} - ${result.warning}`);
    }
  }

  let filledCount = 0;
  let skippedCount = 0;

  const updatedPapers = papers.map((paper) => {
    if (hasAbstractText(paper.abstract)) {
      skippedCount += 1;
      return paper;
    }

    const doi = normaliseDoi(paper.doi);
    if (!doi) {
      return paper;
    }

    const result = abstractByDoi.get(doi);
    if (result?.status === "found") {
      filledCount += 1;
      return { ...paper, abstract: result.abstract };
    }

    return paper;
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    `${JSON.stringify(updatedPapers, null, 2)}\n`,
    "utf-8",
  );

  console.log("");
  console.log("✅ Done.");

  printSummary({
    results: Array.from(abstractByDoi.values()),
    filledCount,
    skippedCount,
    missingDoiCount,
  });
};

main().catch((error) => {
  console.error("");
  console.error("========================================");
  console.error("❌ Failed to fill abstracts from JSON");
  console.error("========================================");
  console.error(error instanceof Error ? error.message : String(error));
  console.error("========================================");
  process.exit(1);
});
