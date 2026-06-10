# Research Paper Converter

Converts a curated CSV spreadsheet into `researchPapers.json` for the web app.

**CSV writing guide (handover):** [CSV_WRITING_GUIDE.md](CSV_WRITING_GUIDE.md)

Typical pipeline:

1. [abstract-collector](../abstract-collector/) — fetch missing abstracts (CSV or JSON)
2. Convert CSV → JSON
3. Copy output to `frontend/src/data/researchPapers.json`

Run from the **repository root**:

```bash
node scripts/research-paper-converter/csv_to_research_papers_json.js
```

Review the output at `scripts/research-paper-converter/output/researchPapers.json`, then copy it to `frontend/src/data/researchPapers.json`:

```bash
cp scripts/research-paper-converter/output/researchPapers.json \
   frontend/src/data/researchPapers.json
```

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

Reads the single CSV in `input/` and merges into existing `frontend/src/data/researchPapers.json`:

- CSV row with matching DOI → **updates** that paper (same `id` kept)
- CSV row with new DOI → **appended** with next numeric `id`
- Paper in JSON but **not** in CSV → **unchanged**, kept in output
- CSV **Abstract** empty for a matched DOI → **keeps existing JSON abstract** (not wiped)

Writes: `scripts/research-paper-converter/output/researchPapers.json`

### Partial update (add or fix a few papers)

Keep `frontend/src/data/researchPapers.json` as-is. Put a CSV with only the rows you want to add or update in `input/`, then run the script.


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

Each site uses `Region > Subregion (side)`. Separate multiple sites with `,` or `;`:

```
Arm > Forearm (left); Hand > Palm (right)
Arm > Forearm (left), Hand > Palm (right)
```

See [CSV_WRITING_GUIDE.md](CSV_WRITING_GUIDE.md) for allowed regions and subregions.

## Console output

At the end the script prints:

- Input row count
- Existing papers updated vs new papers added
- Abstracts preserved from existing JSON
- Papers preserved from existing JSON (not in CSV)
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
| Paper IDs changed unexpectedly     | Check `--existing` path; ensure `frontend/src/data/researchPapers.json` exists when updating    |
| Old papers still in output         | For full rebuild, delete/rename existing JSON before running (see above)                        |
