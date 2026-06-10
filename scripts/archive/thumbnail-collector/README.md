# Thumbnail Collector (archived)

**Status:** Archived — not maintained.

This folder holds a one-time batch utility used during initial data prep. The resulting images are already in `frontend/public/paper-thumbnails/`. For new papers, add images directly — see [docs/PAPER_THUMBNAILS.md](../../../docs/PAPER_THUMBNAILS.md).

## Why archived

- **Semi-manual:** Each row required opening a browser, pasting a DevTools snippet, and pressing Enter in the terminal.
- **Environment-specific:** Assumed macOS paths (`~/Downloads`, `~/Documents/Screenshots`).
- **Publisher-specific:** The browser snippet targeted ACM HTML (`section.body figure img`).
- **Low reuse:** ~97 thumbnails were collected once; ongoing adds are faster by hand than running this workflow.

## What it did (historical)

| File                          | Role                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `process.js`                  | Walked `targets.csv` pending rows; moved the latest image from Downloads into `output/` with a DOI-based filename |
| `process-skipped.js`          | Same for rows marked `skip`, using a manual PDF-viewer screenshot from the Screenshots folder                     |
| `browser-download-snippet.js` | Pasted into DevTools on an ACM HTML page to download the first body figure                                        |
| `targets.sample.csv`          | Example CSV shape (`id`, `doi`, `url`, `status`, `image_file`, `notes`)                                           |

`targets.csv` and `output/` were local-only (gitignored). Finished files were copied into `frontend/public/paper-thumbnails/` and committed there.

## If you still need to run it

```bash
cd scripts/archive/thumbnail-collector
npm install
# Create targets.csv from targets.sample.csv, then:
npm run process          # normal ACM HTML workflow
npm run process:skipped  # manual screenshot fallback
```

Expect to adjust hard-coded paths in the scripts for your machine. Prefer the direct copy workflow in the archive README instead.
