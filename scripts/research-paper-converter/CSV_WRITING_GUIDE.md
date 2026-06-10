# CSV Writing Guide (Research Paper Converter)

Follow these rules when editing the spreadsheet so `csv_to_research_papers_json.js` produces a valid `researchPapers.json` for the web app.

Related files:

- Column header mapping: [`column_mapping.js`](column_mapping.js)
- Running the converter: [`README.md`](README.md)
- Abstract collection: [`../abstract-collector/README.md`](../abstract-collector/README.md)

---

## 1. End-to-end workflow

1. Edit the CSV (follow this guide)
2. (Optional) Fetch abstracts: `node scripts/abstract-collector/collect_abstracts_from_csv.js`
3. Place the CSV in `input/` and run: `node scripts/research-paper-converter/csv_to_research_papers_json.js`
4. Copy the output into the app:
   ```bash
   cp scripts/research-paper-converter/output/researchPapers.json \
      frontend/src/data/researchPapers.json
   ```

The converter **merges** CSV rows into existing JSON (matched by DOI). Papers in JSON but not in the CSV are kept.

- Partial update: keep `frontend/src/data/researchPapers.json` and run with a CSV of changed rows only.
- Full rebuild: delete or rename `frontend/src/data/researchPapers.json` first, then run — output contains CSV rows only.

---

## 2. General rules

### 2.1 DOI (required)

| CSV column | `DOI` |
| ---------- | ----- |

- **Every row must have a DOI.** Rows without one are **skipped**.
- DOI is the unique key for each paper. During merge, it is used to preserve existing `id` values.
- Accepted formats:
  - `10.1145/3654777.3676460`
  - `https://doi.org/10.1145/3654777.3676460`
- **Duplicate DOIs** in the same CSV: only the first row is used.

### 2.2 Empty / “not reported” values

The following are treated as **empty** (numbers → `null`, lists → `[]`, text → `null`):

```
(blank), N/A, NA, n.a., null, none, unknown, unclear,
not specified, not reported, not applicable, not available,
no report, no specific report
```

For filter columns `senses`, `thermalTransferModes`, and `materialsInContactWithSkin`, `no` and `no.` are also treated as empty.

### 2.3 Multi-value separators

| Field type                                                     | Separator                                           |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `bodySites`                                                    | **`;` (semicolon) only** — separates multiple sites |
| `senses`, `thermalTransferModes`, `materialsInContactWithSkin` | `,` or `;` or newline                               |
| `otherSensoryActuators`, `auxiliaryHardware`                   | `;` or newline                                      |

### 2.4 CSV format

- Save as UTF-8 (BOM is fine)
- Wrap cells in **double quotes** if they contain commas or newlines
- Escape literal double quotes as `""`
- Header names must match [`column_mapping.js`](column_mapping.js). If a header is renamed, update the **array values** in that file only.

### 2.5 Column headers (current)

| JSON field                      | CSV header (primary)                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| publicationYear                 | Publication Year                                                                    |
| **publicationSortDate**         | **Publication Sort Date**                                                           |
| publicationVenue                | Venue                                                                               |
| authors                         | Author                                                                              |
| title                           | Title                                                                               |
| doi                             | DOI                                                                                 |
| url                             | Url                                                                                 |
| abstract                        | Abstract                                                                            |
| **senses**                      | **Multisensory perception (simplify)**                                              |
| **thermalTransferModes**        | **Thermal transfer modes - HK Cleaned**                                             |
| **bodySites**                   | **Body parts (Main > Sub)**                                                         |
| bodyPartsInvolved               | Body parts involved - which side (dorsal, ventral) and which skin (glabrous, hairy) |
| materialsInContactWithSkinNotes | Material(s) in contact with skin                                                    |
| **materialsInContactWithSkin**  | **Material(s) in contact with skin - for filter**                                   |

See [`column_mapping.js`](column_mapping.js) for the full list.

---

## 3. publicationSortDate

| CSV column | `Publication Sort Date` |
| ---------- | ----------------------- |

### Purpose

Used to **sort search results** in the web app (newest first). `publicationYear` alone cannot distinguish order within the same year, so a separate date column is required.

### Format

**ISO date `YYYY-MM-DD`**

| Input                               | JSON output                             |
| ----------------------------------- | --------------------------------------- |
| `2024-10-11`                        | `"2024-10-11"`                          |
| (empty) + Publication Year = `2024` | `"2024-01-01"` (January 1 of that year) |
| (empty) + no year                   | `"0000-01-01"`                          |

### Important notes

- Formats like `2024/10/11` or `Oct 11 2024` are stored as-is but sort as strings — **always use `YYYY-MM-DD`**.
- If month/day are unknown, use January 1 of the known year (e.g. `2024-01-01`).
- If `Publication Sort Date` is left blank, the converter falls back to `Publication Year`.

### Example

```csv
Publication Year,Publication Sort Date,...
2024,2024-10-11,...
2023,,...
```

→ The second row becomes `"2023-01-01"`.

---

## 4. senses (for filters)

| CSV column | `Multisensory perception (simplify)` |
| ---------- | ------------------------------------ |

### Purpose

Maps to **Other filters → Senses** chips in the web app. This is not free text — values are converted to fixed slugs.

### Allowed values → app slug

| CSV label (examples)                                  | App slug             | UI label           |
| ----------------------------------------------------- | -------------------- | ------------------ |
| `Thermal`, `Thermal alone` (only when no other sense) | `thermal-alone`      | Thermal-alone      |
| `Tactile`, `Haptic tactile`, `Tactile (vib)`          | `haptic-tactile`     | Haptic-Tactile     |
| `Force`, `Force (pressure)`                           | `haptic-force`       | Haptic-Force       |
| `Kinesthetic motion`                                  | `kinesthetic-motion` | Kinesthetic/motion |
| `Visual`                                              | `visual`             | Visual             |
| `Auditory`                                            | `auditory`           | Auditory           |
| `Olfactory`                                           | `olfactory`          | Olfactory          |
| `Trigeminal nerve`                                    | `trigeminal-nerve`   | Trigeminal nerve   |
| `Gustatory`                                           | `gustatory`          | Gustatory          |
| `Body general`                                        | `body-general`       | Body (general)     |

### Multiple senses

Separate with comma, semicolon, or newline:

```csv
Visual, Tactile
```

→ `["visual", "haptic-tactile"]`

### thermal-alone rules (important)

| CSV input          | Result                                            |
| ------------------ | ------------------------------------------------- |
| Empty / N/A / no   | `["thermal-alone"]`                               |
| `Thermal` **only** | `["thermal-alone"]`                               |
| `Thermal, Tactile` | `["haptic-tactile"]` — thermal-alone **excluded** |
| `Tactile`          | `["haptic-tactile"]`                              |

`thermal-alone` is used only when thermal is the sole sense. If other senses are present, thermal-alone is not added.

### Common mistakes

- Entering values in `Multisensory perception` (without **simplify**) → converter does not read that column
- Unmapped words like `Haptic`, `Vibration` → **warning** logged, value ignored
- Long sentences in one cell → mapping fails. Use **short keywords** only

---

## 5. thermalTransferModes (for filters)

| CSV column | `Thermal transfer modes - HK Cleaned` (or alias) |
| ---------- | ------------------------------------------------ |

### Purpose

Maps to **Other filters → Thermal transfer modes** chips in the web app.

### Allowed values

| CSV label (examples)       | App slug     |
| -------------------------- | ------------ |
| `Conduction`, `conduction` | `conduction` |
| `Radiation`, `radiation`   | `radiation`  |
| `Convection`, `convection` | `convection` |

Substring matching also works (e.g. `Conduction (Peltier)` → `conduction`).

### Multiple modes

```csv
Conduction, Convection
```

→ `["conduction", "convection"]`

### Empty values

Blank or N/A → `[]` (no filter chips)

### Common mistakes

- `Chemical`, `Electrical`, etc. → **no mapping**, warning logged and value ignored
- If the paper does not use conduction/radiation/convection, **leave blank** — do not force a value
- Older header `Thermal transfer modes` (without HK Cleaned) — OK if listed as an alias in `column_mapping.js`

---

## 6. bodySites (filters & body map)

| CSV column | `Body parts (Main > Sub)` |
| ---------- | ------------------------- |

### Purpose

- **Body map** dot / heatmap positions on the web app
- **Paper card** keywords (Body location chips)

Use the **`bodyPartsInvolved`** column for free-text descriptions. This column accepts **structured slugs** only.

### Format

**One site = `Region > Subregion (side)`**

- **Multiple sites**: separate with **`;` (semicolon)** — not comma
- `Region`, `Subregion`: human-readable English (converter converts to kebab-case)
- `(side)`: optional. Only `left` or `right`. Omit for no side

```
Arm > Forearm
Arm > Forearm (left); Hand > Palm (right)
Whole body > General
Head > Forehead (left)
```

### Region (L1) — allowed values

| CSV example | JSON `region` |
| ----------- | ------------- |
| Head        | `head`        |
| Neck        | `neck`        |
| Torso       | `torso`       |
| Arm         | `arm`         |
| Wrist       | `wrist`       |
| Hand        | `hand`        |
| Leg         | `leg`         |
| Gluteal     | `gluteal`     |
| Ankle       | `ankle`       |
| Foot        | `foot`        |
| Whole body  | `whole-body`  |

### Subregion (L2) — examples by parent

| Region     | Subregion examples                                                         |
| ---------- | -------------------------------------------------------------------------- |
| head       | `general`, `ear`, `forehead`, `nose`, `cheek`, `lip`, `tongue`             |
| neck       | `general`, `posterior`, `anterior`                                         |
| torso      | `general`, `shoulder`, `chest`, `abdomen`, `back`                          |
| arm        | `general`, `upper-arm`, `forearm`                                          |
| wrist      | `general`, `ventral`, `dorsal`                                             |
| hand       | `general`, `palm`, `fingertips`, `fingers`, `thenar-eminence`, `hand-back` |
| leg        | `general`, `thigh`, `crural`, `crural-region`                              |
| foot       | `general`, `sole`, `toes`                                                  |
| whole-body | `general`                                                                  |

If subregion is omitted, it defaults to `general`:

```
Arm > Forearm   →  { region: "arm", subregion: "forearm", side: null }
Hand            →  { region: "hand", subregion: "general", side: null }
```

### JSON example

CSV:

```
Arm > Forearm (left)
```

JSON:

```json
"bodySites": [
  { "region": "arm", "subregion": "forearm", "side": "left" }
]
```

### Common mistakes

- Using **comma** to separate sites → `Arm > Forearm, Hand > Palm` may parse as a **single** site. **Always use `;`**
- Side text other than left/right, e.g. `(Left hand)` → side parsing warning
- `N/A`, `not specified` → `bodySites: []`
- Long free-text descriptions in this column → use **`bodyPartsInvolved`** instead

---

## 7. materialsInContactWithSkin (for filters)

There are **two** material columns — do not confuse them.

| CSV column                                      | Purpose                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `Material(s) in contact with skin`              | **Free text** → `materialsInContactWithSkinNotes` (detail page prose) |
| `Material(s) in contact with skin - for filter` | **Filter slugs** → `materialsInContactWithSkin` (Other filters chips) |

The rules below apply to the **`- for filter`** column only.

### Allowed values → app slug

| CSV label (examples)                  | App slug              | UI label              |
| ------------------------------------- | --------------------- | --------------------- |
| Metal                                 | `metal`               | Metal                 |
| Ceramic                               | `ceramic`             | Ceramic               |
| Fabrics, Textiles, Fabrics & Textiles | `fabrics-textiles`    | Fabrics & Textiles    |
| Latex                                 | `latex`               | Latex                 |
| Polymer, Synthetics                   | `polymers-synthetics` | Polymers & Synthetics |
| Silicone                              | `silicone-based`      | Silicone-Based        |
| Foam, Cushioning                      | `foam-cushioning`     | Foam & Cushioning     |
| Liquid, Gel                           | `liquids-gels`        | Liquids & Gels        |
| Air, Gas                              | `air-gas`             | Air / Gas             |
| Chemical                              | `chemical`            | Chemical              |

You may also write slugs directly (e.g. `air-gas`).

### Multiple materials

```csv
Fabrics & Textiles, Air / Gas
```

→ `["fabrics-textiles", "air-gas"]`

### Empty values

Blank or N/A → `[]`

### Common mistakes

- Long prose like `Peltier ceramic surface...` in the **Notes** column → does not affect filters. Notes go in the notes column; filters go in **for filter**
- `Plastic`, `Wood`, etc. → no mapping, **warning** logged
- If contact material is unclear, leave the filter column **blank** and describe only in the notes column

---

## 8. bodyPartsInvolved vs bodySites

|            | bodySites                           | bodyPartsInvolved                        |
| ---------- | ----------------------------------- | ---------------------------------------- |
| CSV column | Body parts (Main > Sub)             | Body parts involved - …                  |
| Format     | Structured (`Arm > Forearm (left)`) | **Free text**                            |
| Used for   | Filters, body map, card chips       | Detail page text **below** Body location |

Both can be filled for the same paper. Example: `Arm > Forearm` in bodySites, and `"Ventral side between wrist and elbow (page 5)"` in bodyPartsInvolved.

---

## 9. Pre-conversion checklist

- [ ] Every row has a **DOI**
- [ ] No duplicate DOIs
- [ ] `Publication Sort Date` is `YYYY-MM-DD` (or leave blank and fill in Publication Year)
- [ ] `Multisensory perception (simplify)` — allowed sense keywords only; separate multiple values with `,` or `;`
- [ ] `Thermal transfer modes - HK Cleaned` — conduction / radiation / convection only
- [ ] `Body parts (Main > Sub)` — `Region > Subregion (side)`; **separate sites with `;`**
- [ ] `Material(s) in contact with skin - for filter` — allowed material keywords (distinct from Notes column)
- [ ] Review **WARN** messages in the terminal after running the converter

---

## 10. Interpreting converter warnings

| Warning                         | Meaning                           | Action                                             |
| ------------------------------- | --------------------------------- | -------------------------------------------------- |
| `Invalid senses value`          | Sense mapping failed              | Fix value in simplify column                       |
| `Invalid thermal transfer mode` | Transfer mode mapping failed      | Use conduction/radiation/convection or leave blank |
| `Invalid material value`        | Material mapping failed           | Fix for filter column value                        |
| `Invalid body side`             | Side is not `(left)` or `(right)` | Fix side notation                                  |
| `missing DOI`                   | No DOI on row                     | Add DOI                                            |
| `Missing mapped CSV columns`    | Header name mismatch              | Update `column_mapping.js` or CSV headers          |

---

## 11. Quick reference — valid row examples

```csv
Publication Year,Publication Sort Date,Venue,Author,Title,DOI,...,Multisensory perception (simplify),Thermal transfer modes - HK Cleaned,Material(s) in contact with skin - for filter,Body parts (Main > Sub),...
2024,2024-10-11,UIST,"Author A; Author B",Example Paper Title,10.1145/1234567.8901234,...,Tactile,Conduction,,"Arm > Forearm (left)",...
2023,2023-06-15,CHI,Author C,Another Paper,10.1145/9876543.2109876,...,"Visual, Olfactory","Conduction, Convection",Air / Gas,"Hand > Palm; Wrist > General",...
```

After conversion, copy into the app:

```bash
node scripts/research-paper-converter/csv_to_research_papers_json.js
cp scripts/research-paper-converter/output/researchPapers.json frontend/src/data/researchPapers.json
```

If column headers change, check with a developer whether `column_mapping.js` needs to be updated.
