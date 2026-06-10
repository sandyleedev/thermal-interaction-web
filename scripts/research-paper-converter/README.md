# Research Paper Converter

Converts a curated CSV spreadsheet into `researchPapers.json` for the web app.

**CSV writing guide (handover):** [CSV_WRITING_GUIDE.md](CSV_WRITING_GUIDE.md)

Typical pipeline:

1. [abstract-collector](../abstract-collector/) — fetch missing abstracts (CSV or JSON)
2. **this script** — CSV → JSON
3. Copy output to `frontend/src/data/researchPapers.json`

You can also backfill abstracts directly on JSON with `fill_abstracts_from_json.js` — see [abstract-collector README](../abstract-collector/README.md).

## Folder layout

```
scripts/research-paper-converter/
├── csv_to_research_papers_json.js   # Main script
├── column_mapping.js                # CSV column ↔ JSON field mapping (edit this)
├── helper/
│   ├── sense_mapping.js             # Sense label → filter slug
│   ├── material_mapping.js          # Material label → filter slug
│   └── thermal_transfer_mode_mapping.js
├── input/                           # Put exactly one CSV here
└── output/
    └── researchPapers.json          # Generated output
```

## Usage

Run from the **repository root**.

### 1. Default — merge (add / update papers)

```bash
node scripts/research-paper-converter/csv_to_research_papers_json.js
```

Reads the single CSV in `input/` and merges into existing `frontend/src/data/researchPapers.json`:

- CSV row with matching DOI → **replaces** that paper (same `id` kept)
- CSV row with new DOI → **appended** with next numeric `id`
- Paper in JSON but **not** in CSV → **unchanged**, kept in output
- CSV **Abstract** empty for a matched DOI → **keeps existing JSON abstract** (not wiped)

Writes: `scripts/research-paper-converter/output/researchPapers.json`

### 2. Replace — full rebuild (CSV rows only)

Use when the CSV is the complete paper list and papers not in the CSV should be removed.

```bash
node scripts/research-paper-converter/csv_to_research_papers_json.js --replace
```

Papers in `frontend/src/data/researchPapers.json` that are **not** in the CSV are **not** included in the output.

### When to use which mode

| Task                                     | Command                           |
| ---------------------------------------- | --------------------------------- |
| Add a few new papers                     | default (partial CSV)             |
| Fix fields on existing papers            | default (CSV rows for those DOIs) |
| Regenerate entire corpus from master CSV | `--replace`                       |

### Updating columns

When the **spreadsheet header text** changes but the data meaning stays the same, edit the string inside the array in `column_mapping.js`. Keys on the left are fixed JSON field names — do not rename them here.

```js
// Before: CSV header renamed from "Author" to "Authors"
authors: ["Author"],
// After:
authors: ["Authors"],
```

**Adding a header alias** — append another string to the array (order = priority):

```js
authors: ["Authors", "Author"],
minDurationSec: ["Duration min (sec)", "Duration min", "DurationMin"],
```

### Body sites format

Source column: `Body parts (Main > Sub)`

Each site is semicolon-separated:

```
Arm > Forearm; Hand > Palm (right)
```

- `Region > Subregion` — converted to kebab-case slugs
- Optional `(left)` / `(right)` side suffix
- Missing subregion → `general`

## Console output

At the end the script prints:

- Input row count
- Existing papers updated vs new papers added
- Abstracts preserved from existing JSON (merge mode)
- Skipped / duplicate rows
- Output file path

Check warnings for missing columns, invalid body sides, or unmapped sense/material values.

## Troubleshooting

| Problem                            | What to do                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `No CSV file was found`            | Add one `.csv` to `input/`                                                                      |
| `More than one CSV file was found` | Keep only one file in `input/`                                                                  |
| `Missing mapped CSV columns`       | Update `column_mapping.js` to match your header names                                           |
| Rows skipped (missing DOI)         | Fill in the DOI column                                                                          |
| Wrong filter slugs in app          | Check `sense_mapping.js`, `material_mapping.js`, or `thermal_transfer_mode_mapping.js`          |
| Paper IDs changed unexpectedly     | Check `--existing` path; ensure `frontend/src/data/researchPapers.json` exists when using merge |
