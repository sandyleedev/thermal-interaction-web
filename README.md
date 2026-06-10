# Thermal Interaction Web

A static website for exploring thermal-interaction research papers with interactive filters and a body-map visualisation. There is no backend — the app loads a JSON dataset and runs in the browser.

This repository holds both the **website** (`frontend/`) and **offline tools** (`scripts/`) for curating that dataset. If you maintain the paper list, you will edit files in a code editor and run a few terminal commands — not only open the site in a browser.

---

## Before you start

### Install Node.js

Install the current LTS version from [nodejs.org](https://nodejs.org/).

Check it works in a terminal:

```bash
node -v
npm -v
```

| Tool    | Version          |
| ------- | ---------------- |
| Node.js | 20.19+ or 22.12+ |
| npm     | 10+              |

### Open the project in a code editor

Use a code editor that can open a folder and includes a built-in terminal — for example [Visual Studio Code](https://code.visualstudio.com/) or [Cursor](https://cursor.com/).

1. Unzip or clone this repository.
2. In your editor, choose **File → Open Folder** and select the project root (`thermal-interaction-web`).
3. Use the editor’s terminal (e.g. **Terminal → New Terminal**) for the commands below.

You will work with:

| Area                                    | What you do there                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Spreadsheet / CSV                       | Curate paper metadata (see [CSV writing guide](scripts/research-paper-converter/CSV_WRITING_GUIDE.md)) |
| `scripts/`                              | Run converters and abstract fetchers                                                                   |
| `frontend/src/data/researchPapers.json` | Dataset the website reads (updated by the converter)                                                   |
| `frontend/public/paper-thumbnails/`     | Optional preview images per paper (see [thumbnail guide](docs/PAPER_THUMBNAILS.md))                    |

---

## Preview the website

Run these from the **`frontend`** folder (in the editor terminal: `cd frontend` if you are at the repo root).

### 1. Install dependencies (first time only)

```bash
npm install
```

### 2. Start the local server

```bash
npm run dev
```

### 3. Open in your browser

The terminal prints a URL, usually:

```text
http://localhost:5173
```

Open that URL to see the site. After you change `researchPapers.json`, save the file and refresh the browser.

### 4. Stop the server

In the terminal, press `Ctrl + C`.

**Without an editor:** on macOS you can right-click the `frontend` folder in Finder and choose **Open in Terminal**, then run the same commands. That is enough to _view_ the site, but not to update the dataset.

<img src="/docs/open-in-terminal.png" alt="Open in Terminal on macOS" width="400">

---

## Update the research dataset

Typical workflow when adding or editing papers:

1. **Edit the spreadsheet** — follow [CSV_WRITING_GUIDE.md](scripts/research-paper-converter/CSV_WRITING_GUIDE.md) for column formats (DOI, body sites, filters, dates, etc.).
2. **Fetch missing abstracts (optional)** — [abstract-collector README](scripts/abstract-collector/README.md): put one CSV in `scripts/abstract-collector/input/`, run the script, use the output CSV in the next step.
3. **Convert CSV → JSON** — [research-paper-converter README](scripts/research-paper-converter/README.md): put one CSV in `scripts/research-paper-converter/input/`, then from the **repo root**:

   ```bash
   node scripts/research-paper-converter/csv_to_research_papers_json.js
   cp scripts/research-paper-converter/output/researchPapers.json \
      frontend/src/data/researchPapers.json
   ```

4. **Preview** — `cd frontend && npm run dev`, check filters, body map, and paper detail pages.
5. **Thumbnails (optional)** — download or capture a figure, rename by DOI, put in `frontend/public/paper-thumbnails/`; see [PAPER_THUMBNAILS.md](docs/PAPER_THUMBNAILS.md).

Read the script READMEs for merge behaviour (update by DOI, partial CSVs, warnings). Fix any `WARN` lines in the terminal before relying on the output.

6. **Publish** — commit and push to `main` so the live site updates; see [PUBLISHING.md](docs/PUBLISHING.md).

---

## Commands reference

From **`frontend/`**:

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the local development server        |
| `npm run build`   | Typecheck and create the production build |
| `npm run preview` | Preview the production build locally      |
| `npm run lint`    | Run ESLint                                |

Dataset scripts are documented under `scripts/` — start with [research-paper-converter](scripts/research-paper-converter/README.md) and [abstract-collector](scripts/abstract-collector/README.md).

---

## Troubleshooting

### Node.js version warning

If `npm install` fails or Vite warns about Node.js, install a newer LTS (20.19+ or 22.12+).

### Port already in use

If port `5173` is busy, Vite may use another port — use the URL shown in the terminal.

### Changes not visible in the browser

- Confirm you copied the converter output to `frontend/src/data/researchPapers.json`.
- Save the file and hard-refresh the browser (or restart `npm run dev`).

### Converter warnings

See [research-paper-converter README — Troubleshooting](scripts/research-paper-converter/README.md#troubleshooting). Common fixes: fill in DOIs, match CSV column headers in `column_mapping.js`, use allowed values from the CSV writing guide.

---

## Further reading

- [CSV_WRITING_GUIDE.md](scripts/research-paper-converter/CSV_WRITING_GUIDE.md) — how to fill the spreadsheet
- [PUBLISHING.md](docs/PUBLISHING.md) — commit, push, and deploy to the live site
- [PAPER_THUMBNAILS.md](docs/PAPER_THUMBNAILS.md) — add preview images (DOI filename, download or screenshot)
