# CSV Writing Guide

Guide for editing the research paper spreadsheet. Follow these examples so the web app filters, body map, and paper list work correctly.

To run the converter, see [README.md](README.md).

---

## Before you start

**Every row needs a DOI.** Rows without one are skipped.

| Write in `DOI` column                     | OK?              |
| ----------------------------------------- | ---------------- |
| `10.1145/3654777.3676460`                 | Yes              |
| `https://doi.org/10.1145/3654777.3676460` | Yes              |
| _(blank)_                                 | No — row skipped |

Treat these as **empty**: blank, `N/A`, `not reported`, `not specified`, `unknown`, `no`.

If a cell contains commas or line breaks, wrap the whole cell in double quotes.

---

## Columns that need exact formats

Most columns are free text. The five columns below control **filters** and the **body map** — use the keywords and patterns shown here.

| What it controls                | CSV column header                               |
| ------------------------------- | ----------------------------------------------- |
| Sort order (newest first)       | `Publication Sort Date`                         |
| Senses filter                   | `Multisensory perception (simplify)`            |
| Thermal transfer filter         | `Thermal transfer modes - HK Cleaned`           |
| Body map & body location filter | `Body parts (Main > Sub)`                       |
| Material filter                 | `Material(s) in contact with skin - for filter` |

---

## Publication Sort Date

Controls **newest-first** order in search results.

| What you write                            | What happens                 |
| ----------------------------------------- | ---------------------------- |
| `2024-10-11`                              | Sorted as October 11, 2024   |
| _(blank)_ and `Publication Year` = `2024` | Treated as `2024-01-01`      |
| `2024/10/11` or `Oct 11 2024`             | Avoid — sorting may be wrong |

**Examples**

| Publication Year | Publication Sort Date | Notes                           |
| ---------------- | --------------------- | ------------------------------- |
| 2024             | 2024-10-11            | Best — exact conference date    |
| 2023             | _(blank)_             | OK — uses Jan 1, 2023           |
| 2022             | 2022-06-01            | OK — month known, day estimated |

---

## Multisensory perception (simplify)

Short keywords only — not full sentences. This column drives the **Senses** filter chips.

**Allowed keywords** (write any of these):

| Write                       | Shows in app as                            |
| --------------------------- | ------------------------------------------ |
| `Thermal`                   | Thermal-alone _(only when no other sense)_ |
| `Tactile`, `Haptic tactile` | Haptic-Tactile                             |
| `Force`                     | Haptic-Force                               |
| `Kinesthetic motion`        | Kinesthetic/motion                         |
| `Visual`                    | Visual                                     |
| `Auditory`                  | Auditory                                   |
| `Olfactory`                 | Olfactory                                  |
| `Trigeminal nerve`          | Trigeminal nerve                           |
| `Gustatory`                 | Gustatory                                  |
| `Body general`              | Body (general)                             |

Separate multiple senses with comma or semicolon:

| Write                   | Result                                             |
| ----------------------- | -------------------------------------------------- |
| `Visual, Tactile`       | Visual + Haptic-Tactile                            |
| `Tactile; Visual`       | Same                                               |
| _(blank)_ or `N/A`      | Thermal-alone                                      |
| `Thermal` only          | Thermal-alone                                      |
| `Thermal, Tactile`      | Haptic-Tactile only _(Thermal-alone is not added)_ |
| `Vibration` or `Haptic` | Ignored — use `Tactile` instead                    |

Use **`Multisensory perception (simplify)`** — not the longer `Multisensory perception` column.

---

## Thermal transfer modes - HK Cleaned

Drives the **Thermal transfer modes** filter. Only these three values work:

| Write        | Shows in app as |
| ------------ | --------------- |
| `Conduction` | Conduction      |
| `Radiation`  | Radiation       |
| `Convection` | Convection      |

**Examples**

| Write                      | Result                                                       |
| -------------------------- | ------------------------------------------------------------ |
| `Conduction`               | Conduction chip                                              |
| `Conduction (Peltier)`     | Conduction chip                                              |
| `Conduction, Convection`   | Both chips                                                   |
| _(blank)_ or `N/A`         | No chip                                                      |
| `Chemical` or `Electrical` | Ignored — leave blank if not conduction/radiation/convection |

---

## Body parts (Main > Sub)

Drives the **body map** and **Body location** chips. Use a fixed pattern — not free text.

**Pattern:** `Region > Subregion (side)`

- **Region** — e.g. `Arm`, `Hand`, `Head` _(see list below)_
- **Subregion** — e.g. `Forearm`, `Palm` _(optional — defaults to General)_
- **(side)** — optional: `(left)` or `(right)` only

**Multiple body sites** — separate with comma **or** semicolon:

| Write                                       | Meaning                   |
| ------------------------------------------- | ------------------------- |
| `Arm > Forearm`                             | One site, no side         |
| `Arm > Forearm (left)`                      | Left forearm              |
| `Hand > Palm (right)`                       | Right palm                |
| `Arm > Forearm (left); Hand > Palm (right)` | Two sites                 |
| `Arm > Forearm (left), Hand > Palm (right)` | Two sites (comma also OK) |
| `Hand`                                      | Hand > General            |
| `Whole body > General`                      | Full body                 |
| `N/A` or `not specified`                    | No body map dot           |

**All regions and subregions**

Write region and subregion names in plain English (capitalisation does not matter). If you omit the subregion, it defaults to `General`.

| Region     | Subregions you can write                                       |
| ---------- | -------------------------------------------------------------- |
| Whole body | General                                                        |
| Head       | General, Ear, Forehead, Nose, Cheek, Lip, Tongue               |
| Neck       | General, Posterior, Anterior                                   |
| Torso      | General, Shoulder, Chest, Abdomen, Back                        |
| Arm        | General, Upper arm, Forearm                                    |
| Wrist      | General, Ventral, Dorsal                                       |
| Hand       | General, Palm, Fingertips, Fingers, Thenar eminence, Hand back |
| Leg        | General, Thigh, Crural, Crural region                          |
| Gluteal    | General                                                        |
| Ankle      | General, Ankle                                                 |
| Foot       | General, Sole, Toes                                            |

**Side (optional, append at the end):** `(left)` or `(right)` only.

**CSV examples using the full list**

| Write                              |
| ---------------------------------- |
| `Head > Forehead (left)`           |
| `Neck > Posterior`                 |
| `Torso > Chest; Torso > Back`      |
| `Arm > Upper arm (right)`          |
| `Wrist > Dorsal`                   |
| `Hand > Thenar eminence (left)`    |
| `Leg > Thigh, Leg > Crural region` |
| `Gluteal > General`                |
| `Ankle > Ankle (right)`            |
| `Foot > Sole`                      |
| `Whole body > General`             |

For extra detail (dorsal/ventral, page references, etc.), use **`Body parts involved - …`** — that column is free text.

**Example — both columns filled**

| Body parts (Main > Sub) | Body parts involved - …                         |
| ----------------------- | ----------------------------------------------- |
| `Arm > Forearm`         | `Ventral side between wrist and elbow (page 5)` |

---

## Material columns — do not mix them up

| CSV column                                      | What to write                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `Material(s) in contact with skin`              | Full sentence, e.g. _"Peltier ceramic surface with Velcro straps"_            |
| `Material(s) in contact with skin - for filter` | Short keywords for filters — **separate multiple with comma** _(table below)_ |

**Filter column — allowed keywords**

| Write                   | Shows in app as       |
| ----------------------- | --------------------- |
| `Metal`                 | Metal                 |
| `Ceramic`               | Ceramic               |
| `Fabrics & Textiles`    | Fabrics & Textiles    |
| `Latex`                 | Latex                 |
| `Polymer`, `Synthetics` | Polymers & Synthetics |
| `Silicone`              | Silicone-Based        |
| `Foam`, `Cushioning`    | Foam & Cushioning     |
| `Liquid`, `Gel`         | Liquids & Gels        |
| `Air`, `Gas`            | Air / Gas             |
| `Chemical`              | Chemical              |

**Examples**

| for filter column    | Notes column                      | Result                    |
| -------------------- | --------------------------------- | ------------------------- |
| `Air / Gas`          | _(blank)_                         | Air/Gas filter chip       |
| _(blank)_            | `Bare Peltier ceramic, no sleeve` | Notes on detail page only |
| `Ceramic, Air / Gas` | `Peltier module with heat sink`   | Two filter chips + notes  |
| `Plastic`            | —                                 | Ignored — not in the list |

---

## Sample rows

**Model examples** — copy these patterns when filling in a row. Use `N/A` or leave blank only when the paper truly does not report that information (see sections above).

For **body sites**, `(left)` and `(right)` are optional — omit the side when the paper does not specify it (e.g. `Arm > Forearm` is fine).

**A — standard wearables study (single site, single sense)**

| Publication Year | Publication Sort Date | DOI                     | Multisensory perception (simplify) | Thermal transfer modes - HK Cleaned | Body parts (Main > Sub) | Material(s) in contact with skin - for filter | Material(s) in contact with skin                              |
| ---------------- | --------------------- | ----------------------- | ---------------------------------- | ----------------------------------- | ----------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| 2024             | 2024-10-11            | 10.1145/3654777.3676460 | Tactile                            | Conduction                          | Arm > Forearm           | Ceramic                                       | Peltier ceramic surface; Velcro strap holds module on forearm |

Exact sort date, one sense keyword, one body site (no side — paper did not specify left/right), filter keyword plus notes for extra detail.

---

**B — multisensory study (multiple filters)**

| Publication Year | Publication Sort Date | DOI                     | Multisensory perception (simplify) | Thermal transfer modes - HK Cleaned | Body parts (Main > Sub)             | Material(s) in contact with skin - for filter | Material(s) in contact with skin                                       |
| ---------------- | --------------------- | ----------------------- | ---------------------------------- | ----------------------------------- | ----------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| 2023             | 2023-06-15            | 10.1145/9876543.2109876 | Visual, Olfactory                  | Conduction, Convection              | Hand > Palm (left), Wrist > General | Air / Gas                                     | Heated air through nasal interface; no direct skin contact with device |

Multiple senses, transfer modes, and body sites (comma-separated). `Hand > Palm (left)` includes side because reported; `Wrist > General` omits it. Filter and notes columns both filled.

---

**C — thermal-alone, whole-body experience**

| Publication Year | Publication Sort Date | DOI                     | Multisensory perception (simplify) | Thermal transfer modes - HK Cleaned | Body parts (Main > Sub) | Material(s) in contact with skin - for filter | Material(s) in contact with skin                          |
| ---------------- | --------------------- | ----------------------- | ---------------------------------- | ----------------------------------- | ----------------------- | --------------------------------------------- | --------------------------------------------------------- |
| 2022             | 2022-04-18            | 10.1145/1111111.2222222 | Thermal                            | Conduction, Radiation               | Whole body > General    | Fabrics & Textiles                            | Participants wore provided 100% cotton long-sleeve shirts |

`Thermal` only → Thermal-alone filter; whole-body site; both material columns filled.

---

**D — multiple contact materials**

| Publication Year | Publication Sort Date | DOI                     | Multisensory perception (simplify) | Thermal transfer modes - HK Cleaned | Body parts (Main > Sub) | Material(s) in contact with skin - for filter | Material(s) in contact with skin                                   |
| ---------------- | --------------------- | ----------------------- | ---------------------------------- | ----------------------------------- | ----------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| 2021             | 2021-05-06            | 10.1145/3333333.4444444 | Tactile, Visual                    | Conduction                          | Hand > Fingertips       | Ceramic, Silicone                             | Peltier ceramic plate with 3 mm silicone safety layer on fingertip |

Two filter keywords separated by comma; notes explain the layered interface. `(left)` or `(right)` on the body site is optional — include only when the paper reports it.

---

## Quick checklist

- [ ] Every row has a **DOI** (no duplicates in the same file)
- [ ] **Publication Sort Date** is `YYYY-MM-DD` when the exact date is known
- [ ] **Multisensory perception (simplify)** — short keywords from the list above
- [ ] **Thermal transfer modes** — Conduction / Radiation / Convection only, or blank
- [ ] **Body parts (Main > Sub)** — `Region > Subregion (side)`; multiple sites with `,` or `;`
- [ ] **Material for filter** — keywords in the filter column; long text in the notes column
- [ ] After conversion, check the terminal for **WARN** messages

If a spreadsheet column is renamed, ask a developer to update `column_mapping.js`.
