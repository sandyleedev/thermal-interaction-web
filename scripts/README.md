# Research papers CSV tools

Offline scripts to edit `frontend/src/data/researchPapers.json`. They do not run in the web app.

Run all commands from this directory:

```bash
cd scripts
```

Requires **Python 3** (stdlib only; no `pip install`).

---

## Files

| File | Purpose |
|------|---------|
| `papers_csv_schema.py` | Column names, slug rules, CSV ↔ JSON parsing (not run directly) |
| `export_research_papers_to_import_csv.py` | JSON → CSV |
| `sync_research_papers_from_csv.py` | CSV → JSON **full replace** |
| `add_research_papers_with_csv.py` | CSV → JSON **append new DOIs only** |
| `papers.csv` | Typical export output (optional; not required in git) |

---

## CSV format

- **Header row** must use exact JSON property names (`doi`, `title`, `publicationYear`, `bodySites`, …). See `CSV_COLUMNS` in `papers_csv_schema.py`.
- **Required column:** `doi` (must start with `10.`).
- **Multi-value columns** (one cell, items separated by `;`):
  - `senses`, `materialsInContactWithSkin`, `thermalTransferModes`
  - `otherSensoryActuators`, `auxiliaryHardware`
- **`bodySites`:** `region > subregion` or `region > subregion > left|right`, multiple sites separated by `;`  
  Example: `arm > forearm; hand > palm > right`  
  L1 regions use kebab-case when compound (`whole-body`), L2 uses kebab-case (`upper-arm`).
- Export uses **UTF-8 with BOM** so Excel opens `Ω`, `°`, etc. correctly.

---

## 1. Export (JSON → CSV)

```bash
python3 export_research_papers_to_import_csv.py -o papers.csv --limit 0
```

- `--limit 0` — all papers (default `3` is a small sample).
- Edit `papers.csv` in Excel or Google Sheets. Prefer **Save as UTF-8 CSV** if Excel re-saves the file.

---

## 2. Add (append new papers)

```bash
python3 add_research_papers_with_csv.py --csv new-rows.csv --dry-run
python3 add_research_papers_with_csv.py --csv new-rows.csv
```

### Where new rows go

- **File:** `frontend/src/data/researchPapers.json` (override with `--json /path/to/file.json`).
- **Position:** New papers are appended to the **end** of the JSON array (after the last existing paper).
- **`id`:** Assigned automatically (`max(existing id) + 1`, then +2, +3, …). The CSV `id` column is **ignored** (export includes it for reference only).
- **`doi`:** Must be new. Rows whose DOI already exists in JSON are **skipped** (existing papers are not updated).

### Safe test

```bash
python3 add_research_papers_with_csv.py --csv new-rows.csv --dry-run
```

`--dry-run` prints what would be added without writing JSON.

---

## 3. Sync (replace entire dataset)

```bash
python3 sync_research_papers_from_csv.py --csv papers.csv
```

- CSV is the **full** list of papers. Anything in JSON whose DOI is **not** in the CSV is **removed**.
- **`id`:** Renumbered `1` … `N` in **CSV row order** (CSV `id` column is ignored).
- There is **no** `--dry-run`. Test on a copy first:

```bash
cp ../frontend/src/data/researchPapers.json /tmp/researchPapers.test.json
python3 sync_research_papers_from_csv.py --csv papers.csv --json /tmp/researchPapers.test.json
```

Always review `git diff` on `researchPapers.json` before committing.

---

## Quick reference

| | **add** | **sync** |
|---|--------|----------|
| CSV scope | New rows only | Full dataset |
| Existing DOI | Skipped | Replaced from CSV |
| New paper position | End of JSON array | N/A (rebuild all) |
| `id` | Auto max+1 | Auto 1…N by row order |
| Dry run | `--dry-run` | Use `--json` copy |

**Unique key for matching:** `doi`, not `id`.

---

## Warnings

After import, the script may print `Warnings` for invalid slugs or malformed `bodySites` segments (those values are skipped).

If you edit CSV in Excel and see mojibake (`5Œ©` instead of `5Ω`), re-export from JSON or re-import with UTF-8; do not sync a corrupted save.
