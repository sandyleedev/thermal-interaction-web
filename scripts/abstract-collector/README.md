# Abstract Collector

Fetches missing paper abstracts from public APIs (Crossref, then OpenAlex) using DOIs in a CSV spreadsheet.

Typical pipeline:

1. **this folder** — fetch missing abstracts into CSV
2. [research-paper-converter](../research-paper-converter/) — CSV → JSON

## Folder layout

```
scripts/abstract-collector/
├── collect_abstracts_from_csv.js   # CSV → CSV with abstracts
├── lib/
│   └── fetch_abstract.js           # Crossref / OpenAlex fetch logic
├── input/                          # Put exactly one CSV here
└── output/
    └── papers-with-abstracts.csv   # Generated output
```

## Usage

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

Run from the **repository root**:

```bash
node scripts/abstract-collector/collect_abstracts_from_csv.js
```

Writes: `scripts/abstract-collector/output/papers-with-abstracts.csv`

Use that CSV as input for the [research-paper-converter](../research-paper-converter/).

To fill abstracts for only a few papers, export a partial CSV with `DOI` (and `Abstract` if present) plus any columns needed for the converter, then run the converter partial-update flow.

## How fetching works

1. Collects unique DOIs that need an abstract.
2. For each DOI:
   - Tries **Crossref** first (`https://api.crossref.org/works/{doi}`)
   - If no abstract, tries **OpenAlex** (`https://api.openalex.org/works/doi:{doi}`)
   - Waits **300 ms** between API calls to reduce rate-limit risk

**Existing abstract text in the CSV is never overwritten.**

## Console output

While running, the script logs progress per DOI and prints a summary at the end:

- Found from APIs
- Not found / invalid DOI / failed requests
- Rows filled, preserved, or left empty
- Rows missing a DOI

Check the **Items Requiring Review** section for DOIs that need manual follow-up.

## Troubleshooting

| Problem                            | What to do                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `No CSV file was found`            | Add one `.csv` file to `input/`                                                    |
| `More than one CSV file was found` | Keep only one file in `input/`                                                     |
| `Could not find DOI column`        | Ensure the CSV has `DOI` or `doi`                                                  |
| `not-found` for many DOIs          | Some publishers do not expose abstracts via Crossref/OpenAlex; fill those manually |
| `invalid-doi`                      | Fix the DOI format in the source file                                              |
| Network errors                     | Retry later; check access to `api.crossref.org` and `api.openalex.org`             |
