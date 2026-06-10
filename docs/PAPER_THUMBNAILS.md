# Paper thumbnails

Optional preview images for papers in the search results and paper detail page.

Thumbnails are **not** stored in the spreadsheet or JSON. Each image is a separate file matched to a paper by **DOI**.

---

## How matching works

The app reads the paper’s `doi` from `researchPapers.json` and looks for a file in:

```text
frontend/public/paper-thumbnails/
```

**Filename rule:** take the DOI and replace every `/` with `_`, then add an extension.

| Paper DOI                     | Image filename                    |
| ----------------------------- | --------------------------------- |
| `10.1145/3654777.3676460`     | `10.1145_3654777.3676460.jpg`     |
| `10.1016/j.ijhcs.2019.07.003` | `10.1016_j.ijhcs.2019.07.003.png` |

Supported extensions (checked in this order): `.jpg`, `.jpeg`, `.png`, `.webp`.

If no file matches, the app shows a **placeholder** — the paper still appears normally.

---

## Adding a thumbnail

1. Open the paper (publisher page, PDF, etc.).
2. **Get an image** — any of these is fine:
   - Download a figure from the HTML page (right-click → Save image)
   - Screenshot the PDF viewer or a key figure
   - Export/crop a figure you already have
3. Pick one representative image (the first figure is usually enough).
4. **Rename** the file using the DOI rule above.
5. **Copy** the file into `frontend/public/paper-thumbnails/`.
6. With `npm run dev` running, **refresh** the browser.

No converter script and no JSON edit are required for thumbnails.

---

## Tips

- **DOI must match exactly** — same DOI as in the spreadsheet / `researchPapers.json`. A typo in the filename means the placeholder stays.
- **One image per paper** — if several extensions exist, `.jpg` is tried first.
- **Replacing an image** — overwrite the old file (same filename) and refresh.
- **Removing a thumbnail** — delete the file from `paper-thumbnails/`; the placeholder returns.

---

## Example

Paper in JSON:

```json
"doi": "10.1145/3623509.3633364"
```

Save or screenshot a figure, rename to `10.1145_3623509.3633364.jpg`, place it here:

```text
frontend/public/paper-thumbnails/10.1145_3623509.3633364.jpg
```

---

## Related

An older semi-automated batch script is kept under [scripts/archive/thumbnail-collector/](../scripts/archive/thumbnail-collector/) for reference only. It was never very convenient to run (browser DevTools, Downloads folder, row-by-row prompts), so **not recommend using it** — adding images by hand as described above is simpler.
