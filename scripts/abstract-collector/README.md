# Abstract Collector

Fetches paper abstracts from public APIs (Crossref, then OpenAlex) using DOIs.

Two entry points share the same fetch logic in `lib/fetch_abstract.js`:


| Script                          | Source                | Use when                                    |
| ------------------------------- | --------------------- | ------------------------------------------- |
| `collect_abstracts_from_csv.js` | CSV spreadsheet       | Curating from spreadsheet before converter  |
| `fill_abstracts_from_json.js`   | `researchPapers.json` | Patching missing abstracts in live app data |


Typical pipelines:

**Spreadsheet workflow**

1. **this folder** — fetch missing abstracts into CSV
2. [research-paper-converter](../research-paper-converter/) — CSV → JSON

**JSON maintenance workflow**

1. **fill_abstracts_from_json.js** — fill missing abstracts directly in JSON
2. (Optional) sync abstract back to spreadsheet manually if needed

## Folder layout

```
scripts/abstract-collector/
├── collect_abstracts_from_csv.js   # CSV → CSV with abstracts
├── fill_abstracts_from_json.js     # JSON → JSON with abstracts
├── lib/
│   └── fetch_abstract.js           # Shared Crossref / OpenAlex logic
├── input/                          # Put exactly one CSV here (CSV script)
└── output/
    └── papers-with-abstracts.csv   # CSV script output
```

---

## collect_abstracts_from_csv.js

Place **one** CSV file in `scripts/abstract-collector/input/`.

Required column:


| Column | Notes                                                                       |
| ------ | --------------------------------------------------------------------------- |
| `DOI`  | Case-insensitive header (`doi` also works). Full URL or bare DOI both work. |


Optional column:


| Column     | Notes                                                           |
| ---------- | --------------------------------------------------------------- |
| `Abstract` | If missing, the script adds an `Abstract` column to the output. |


All other columns from the input file are preserved unchanged.

### Usage

```bash
node scripts/abstract-collector/collect_abstracts_from_csv.js
```

Reads the single CSV in `input/` and writes:

`scripts/abstract-collector/output/papers-with-abstracts.csv`

---

## fill_abstracts_from_json.js

Reads `researchPapers.json`, fetches abstracts for papers where `abstract` is empty and `doi` is present, and writes the updated JSON.

**Existing abstracts are never overwritten.**

### Usage

Default — update `frontend/src/data/researchPapers.json` in place:

```bash
node scripts/abstract-collector/fill_abstracts_from_json.js
```

Custom paths:

```bash
node scripts/abstract-collector/fill_abstracts_from_json.js --input path/to/researchPapers.json --output path/to/out.json
```

Positional args also work:

```bash
node scripts/abstract-collector/fill_abstracts_from_json.js input.json output.json
```

---

## How fetching works

1. Collects unique DOIs that need an abstract.
2. For each DOI:
  - Tries **Crossref** first (`https://api.crossref.org/works/{doi}`)
  - If no abstract, tries **OpenAlex** (`https://api.openalex.org/works/doi:{doi}`)
  - Waits **300 ms** between API calls to reduce rate-limit risk

## Console output

While running, the script logs progress per DOI and prints a summary at the end:

- Found from APIs
- Not found / invalid DOI / failed requests
- Rows or papers filled, preserved, or left empty
- Rows or papers missing a DOI

Check the **Items Requiring Review** section for DOIs that need manual follow-up.

## Troubleshooting


| Problem                            | What to do                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `No CSV file was found`            | Add one `.csv` file to `input/` (CSV script only)                                  |
| `More than one CSV file was found` | Keep only one file in `input/`                                                     |
| `Could not find DOI column`        | Ensure the CSV has `DOI` or `doi`                                                  |
| `not-found` for many DOIs          | Some publishers do not expose abstracts via Crossref/OpenAlex; fill those manually |
| `invalid-doi`                      | Fix the DOI format in the source file                                              |
| Network errors                     | Retry later; check access to `api.crossref.org` and `api.openalex.org`             |


