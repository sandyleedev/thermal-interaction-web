# Publishing changes

How to put paper updates on the **live website** after you add or edit papers locally.

Local preview (`npm run dev`) only shows changes on your computer. The public site updates when you **push to the `main` branch** on GitHub — a GitHub Actions workflow builds and deploys to GitHub Pages automatically.

Live site (current project URL):

```text
https://sandyleedev.github.io/thermal-interaction-web/
```

---

## Before you publish

Complete the data workflow first:

1. Edit the spreadsheet and export CSV (see [CSV_WRITING_GUIDE.md](../scripts/research-paper-converter/CSV_WRITING_GUIDE.md)).
2. Run the converter and copy output to `frontend/src/data/researchPapers.json` (see [README — Update the research dataset](../README.md#update-the-research-dataset)).
3. Preview locally with `npm run dev` — check search, filters, body map, and the changed paper’s detail page.
4. (Optional) Add thumbnails under `frontend/public/paper-thumbnails/` ([PAPER_THUMBNAILS.md](PAPER_THUMBNAILS.md)).

Fix any converter `WARN` messages before publishing.

---

## What to commit

Usually these files:

| File / folder                           | When                                        |
| --------------------------------------- | ------------------------------------------- |
| `frontend/src/data/researchPapers.json` | Always — this is the dataset the site uses  |
| `frontend/public/paper-thumbnails/…`    | When you added or replaced thumbnail images |

You do **not** need to commit:

- CSV files in `scripts/…/input/` (local working copies)
- `scripts/…/output/` (regenerated anytime from CSV)
- `node_modules/`, `frontend/dist/`

Keeping a copy of your master spreadsheet elsewhere (Google Drive, etc.) is recommended, but the spreadsheet itself does not have to live in this repository.

---

## Publish with Git (terminal)

Run from the **repository root** in your editor terminal.

### 1. Pull latest changes

Avoid overwriting work others may have pushed:

```bash
git pull origin main
```

If Git reports a merge conflict, resolve it in the editor or ask someone with repo access for help before continuing.

### 2. Check what changed

```bash
git status
```

Confirm `researchPapers.json` (and any new thumbnails) appear under modified or new files.

### 3. Stage and commit

```bash
git add frontend/src/data/researchPapers.json
# If you added thumbnails:
git add frontend/public/paper-thumbnails/

git commit -m "Update research papers: add/edit papers for [brief note]"
```

Use a short message that says what you did, e.g. `Add 3 CHI 2024 papers` or `Fix body sites for paper 42`.

### 4. Push to GitHub

```bash
git push origin main
```

GitHub will ask you to sign in if this is your first push from this machine.

---

## Publish with VS Code (GUI)

1. Open the **Source Control** view (branch icon on the left).
2. Under **Changes**, review `researchPapers.json` and any thumbnail files.
3. Click **+** next to each file to stage (or **+** on **Changes** to stage all).
4. Enter a commit message, click **Commit**.
5. Click **Sync Changes** or **Push** to send to `main`.

Pull first if the editor shows you are behind the remote.

---

## After you push

1. Open the repository on GitHub: [github.com/sandyleedev/thermal-interaction-web](https://github.com/sandyleedev/thermal-interaction-web).
2. Go to the **Actions** tab.
3. Wait for the latest **Deploy site to GitHub Pages** workflow to finish with a green check (usually a few minutes).
4. Open the live site and hard-refresh (`Cmd + Shift + R` on macOS, `Ctrl + Shift + R` on Windows):
   - [https://sandyleedev.github.io/thermal-interaction-web/](https://sandyleedev.github.io/thermal-interaction-web/)
5. Search for the paper you changed and open its detail page to confirm.

---

## Checklist

- [ ] Converter ran without unresolved warnings
- [ ] `frontend/src/data/researchPapers.json` updated
- [ ] Checked locally with `npm run dev`
- [ ] `git pull` before commit
- [ ] Committed JSON (and thumbnails if any)
- [ ] Pushed to `main`
- [ ] GitHub Actions deploy succeeded
- [ ] Live site shows the update

---

## Troubleshooting

### Changes visible locally but not on the live site

- You may have previewed without pushing. Run `git status` — if changes are still uncommitted or unpushed, complete the steps above.
- Wait for the GitHub Actions workflow to finish.
- Hard-refresh the browser; try a private/incognito window.

### Push rejected (`non-fast-forward`)

Someone else pushed to `main` first. Pull, resolve any conflicts, then push again:

```bash
git pull origin main
git push origin main
```

### Actions workflow failed (red X)

Open the failed run in the **Actions** tab and read the error log. Common causes:

- Build error in `frontend/` — run `cd frontend && npm run build` locally to see the same error.
- Temporary GitHub outage — use **Re-run workflow** on the Actions page.

### No permission to push

You need **write access** to the GitHub repository. Ask the repo owner to add you as a collaborator, or send them your updated `researchPapers.json` (and thumbnails) to commit for you.

---

## Related

- [README.md](../README.md) — local setup and dataset workflow
- [CSV_WRITING_GUIDE.md](../scripts/research-paper-converter/CSV_WRITING_GUIDE.md) — spreadsheet formats
- [PAPER_THUMBNAILS.md](PAPER_THUMBNAILS.md) — preview images
