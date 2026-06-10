# Abstract Collector

Fetches paper abstracts from public APIs (Crossref, then OpenAlex) using DOIs in a CSV file, and writes the results back to a new CSV.

Use this as the first step before [research-paper-converter](../research-paper-converter/) when your source spreadsheet has DOIs but no abstracts yet.

## Folder layout

```
scripts/abstract-collector/
├── collect_abstracts_from_csv.js   # Main script
├── input/                          # Put exactly one CSV here
└── output/
    └── papers-with-abstracts.csv   # Generated output
```

## Input CSV

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

## Usage

### Default (auto-detect input)

```bash
node scripts/abstract-collector/collect_abstracts_from_csv.js
```

The script reads the single CSV in `input/` and writes:

`scripts/abstract-collector/output/papers-with-abstracts.csv`

## How it works

1. Reads the CSV and detects the DOI column.
2. Collects unique DOIs that need an abstract.
3. For each DOI:

- Tries **Crossref** first (`https://api.crossref.org/works/{doi}`)
- If no abstract, tries **OpenAlex** (`https://api.openalex.org/works/doi:{doi}`)
- Waits **300 ms** between API calls to reduce rate-limit risk

1. Writes all original columns plus `Abstract` to the output CSV (UTF-8 with BOM).

## Console output

While running, the script logs progress per DOI and prints a summary at the end:

- Found from APIs
- Not found / invalid DOI / failed requests
- Rows filled, preserved, or left empty
- Rows missing a DOI

Check the **Items Requiring Review** section for DOIs that need manual follow-up.

## Troubleshooting


| Problem                            | What to do                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `No CSV file was found`            | Add one `.csv` file to `input/` (file name can be anything)                                          |
| `More than one CSV file was found` | Keep only one file in `input/`                                                                       |
| `Could not find DOI column`        | Ensure the csv file has `DOI` or `doi`                                                               |
| `not-found` for many DOIs          | Some publishers do not expose abstracts via Crossref/OpenAlex; fill those manually in the output CSV |
| `invalid-doi`                      | Fix the DOI format in the source spreadsheet                                                         |
| Network errors                     | Retry later; check access to `api.crossref.org` and `api.openalex.org`                               |


