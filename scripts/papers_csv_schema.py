"""CSV columns match researchPapers.json keys; cell values use the same slugs as JSON."""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "frontend" / "src" / "data" / "researchPapers.json"

# Header row must use these exact names (same as JSON property names).
CSV_COLUMNS: tuple[str, ...] = (
    "id",
    "doi",
    "title",
    "authors",
    "publicationYear",
    "publicationVenue",
    "url",
    "abstract",
    "temperatureNotes",
    "ambientTempC",
    "minTempC",
    "maxTempC",
    "durationNotes",
    "minDurationSec",
    "maxDurationSec",
    "senses",
    "thermalPerceptionMeasure",
    "thermalCuePurpose",
    "thermalTransferModes",
    "mainActuatorForTemperatureSensation",
    "mainActuatorModel",
    "mainActuatorSize",
    "overallDeviceSize",
    "mainActuatorPossibleTemperatureRange",
    "otherSensoryActuators",
    "auxiliaryHardware",
    "heatControlMethod",
    "powerConsumption",
    "temporalParameters",
    "otherNote",
    "technicalSummary",
    "materialsInContactWithSkin",
    "bodyPartsInvolved",
    "bodySites",
    "powerEnergyConsumption",
)

REQUIRED_CSV_COLUMNS = ("doi",)

BODY_REGION_SLUGS = frozenset({
    "whole-body",
    "arm",
    "hand",
    "head",
    "neck",
    "torso",
    "wrist",
    "foot",
    "leg",
    "ankle",
    "gluteal",
})

BODY_SITE_SIDE_SLUGS = frozenset({"left", "right"})

BODY_SUBREGION_SLUGS = frozenset({
    "general",
    "forearm",
    "upper-arm",
    "hand-back",
    "fingertips",
    "fingers",
    "palm",
    "thenar-eminence",
    "sole",
    "shoulder",
    "chest",
    "abdomen",
    "back",
    "nose",
    "ear",
    "forehead",
    "cheek",
    "lip",
    "tongue",
    "crural-region",
    "thigh",
    "posterior",
    "anterior",
    "ventral",
    "dorsal",
})

SENSE_SLUGS = frozenset({
    "thermal-alone",
    "haptic-tactile",
    "haptic-force",
    "visual",
    "auditory",
    "olfactory",
    "gustatory",
    "trigeminal-nerve",
    "kinesthetic-motion",
    "body-general",
})

THERMAL_ALONE_SENSE = "thermal-alone"

MATERIAL_SLUGS = frozenset({
    "metal",
    "ceramic",
    "fabrics-textiles",
    "latex",
    "polymers-synthetics",
    "silicone-based",
    "foam-cushioning",
    "liquids-gels",
    "air-gas",
    "chemical",
})

THERMAL_MODE_SLUGS = frozenset({
    "conduction",
    "radiation",
    "convection",
    "chemical",
})

NULLISH = frozenset({
    "",
    "n/a",
    "na",
    "null",
    "none",
    "not reported",
    "not specified",
    "not applicable",
    "#value!",
    "relative only",
    "-",
    "—",
})

NULLISH_PREFIX_RE = re.compile(
    r"^(?:n/a|na|not reported|not specified|not applicable)\s*[.:;,\-—]?\s*",
    re.IGNORECASE,
)

INFERENCE_LOG: list[str] = []

NUMERIC_COLUMNS = frozenset({
    "publicationYear",
    "ambientTempC",
    "minTempC",
    "maxTempC",
    "minDurationSec",
    "maxDurationSec",
})

# Multi-value cells use ";" between items (CSV row delimiter is comma).
ARRAY_ITEM_SEP = "; "

SLUG_LIST_COLUMNS = frozenset({
    "senses",
    "materialsInContactWithSkin",
    "thermalTransferModes",
})

FREE_TEXT_LIST_COLUMNS = frozenset({
    "otherSensoryActuators",
    "auxiliaryHardware",
})

ARRAY_LIST_COLUMNS = SLUG_LIST_COLUMNS | FREE_TEXT_LIST_COLUMNS


def parse_header_row(headers: list[str]) -> dict[str, int]:
    """Map JSON property names to column indices (exact header match)."""
    index: dict[str, int] = {}
    for col_idx, raw in enumerate(headers):
        name = raw.strip()
        if name in CSV_COLUMNS and name not in index:
            index[name] = col_idx
    return index


def missing_required_columns(index: dict[str, int]) -> list[str]:
    return [c for c in REQUIRED_CSV_COLUMNS if c not in index]


def log_warning(row_num: int, column: str, detail: str) -> None:
    INFERENCE_LOG.append(f"Row {row_num}, column '{column}': {detail}")


def cell(row: list[str], fields: dict[str, int], column: str) -> str:
    idx = fields.get(column)
    if idx is None or idx >= len(row):
        return ""
    return row[idx].strip()


def is_nullish(value: str) -> bool:
    return value.strip().lower() in NULLISH


def parse_number(value: str) -> float | None:
    if is_nullish(value):
        return None
    cleaned = value.strip().replace(",", ".")
    if re.search(r"[^\d.\-+eE\s]", cleaned.replace(" ", "")):
        m = re.match(r"^(-?\d+(?:\.\d+)?)", cleaned.replace(" ", ""))
        if not m:
            return None
        try:
            return float(m.group(1))
        except ValueError:
            return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_year(value: str) -> int | None:
    m = re.search(r"\b(19|20)\d{2}\b", value)
    return int(m.group(0)) if m else None


def normalize_venue(value: str) -> str:
    v = value.strip()
    if not v:
        return v
    v = re.sub(r"\s+'\d{2}$", "", v)
    v = re.sub(r"\s+\d{4}$", "", v)
    return v.strip()


def normalize_authors(value: str) -> str:
    value = value.strip()
    if not value:
        return value
    parts = [p.strip() for p in value.split(";") if p.strip()]
    if not parts:
        return value
    if all("," in p for p in parts):
        return "; ".join(parts)
    normalized: list[str] = []
    for part in parts:
        words = part.split()
        if len(words) < 2:
            normalized.append(part)
            continue
        family = words[-1]
        given = " ".join(words[:-1])
        normalized.append(f"{family}, {given}")
    return "; ".join(normalized)


def normalize_title(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\n", " ")).strip()


def normalize_optional_string(value: str) -> str | None:
    v = value.strip()
    return None if is_nullish(v) else v


def normalize_preserving_text(value: str) -> str | None:
    v = value.strip()
    if is_nullish(v):
        return None
    while True:
        m = NULLISH_PREFIX_RE.match(v)
        if not m:
            break
        v = v[m.end() :].strip()
        if not v or is_nullish(v):
            return None
    return v


def split_array_cell(value: str, *, allow_comma: bool = False) -> list[str]:
    """Split a multi-value CSV cell on semicolons (and newlines)."""
    if is_nullish(value):
        return []
    pattern = r"[,;\n]+" if allow_comma else r"[;\n]+"
    parts: list[str] = []
    for piece in re.split(pattern, value):
        p = piece.strip()
        if p and not is_nullish(p) and p not in parts:
            parts.append(p)
    return parts


def split_free_text_list(value: str) -> list[str]:
    return split_array_cell(value, allow_comma=False)


def parse_slug_list(
    value: str,
    allowed: frozenset[str],
    column: str,
    row_num: int,
) -> list[str]:
    if is_nullish(value):
        return []
    out: list[str] = []
    for slug in split_array_cell(value, allow_comma=True):
        if slug not in allowed:
            log_warning(row_num, column, f"invalid slug {slug!r} — skipped")
            continue
        if slug not in out:
            out.append(slug)
    return out


def finalize_senses(slugs: list[str]) -> list[str]:
    if THERMAL_ALONE_SENSE in slugs and len(slugs) > 1:
        return [s for s in slugs if s != THERMAL_ALONE_SENSE]
    return slugs


def parse_body_sites(value: str, row_num: int) -> list[dict]:
    if is_nullish(value):
        return []
    sites: list[dict] = []
    segments: list[str] = []
    for part in re.split(r";", value):
        part = part.strip()
        if part:
            segments.append(part)
    for segment in segments:
        if ">" not in segment:
            log_warning(row_num, "bodySites", f"skipped segment without '>': {segment!r}")
            continue
        pieces = [p.strip() for p in segment.split(">")]
        if len(pieces) not in (2, 3):
            log_warning(
                row_num,
                "bodySites",
                f"skipped {segment!r} — use region > subregion or region > subregion > left|right",
            )
            continue
        region, subregion = pieces[0], pieces[1]
        if region == "wholeBody":
            region = "whole-body"
        side: str | None = None
        if len(pieces) == 3:
            side_raw = pieces[2].lower()
            if side_raw not in BODY_SITE_SIDE_SLUGS:
                log_warning(
                    row_num,
                    "bodySites",
                    f"invalid side in {segment!r} — use left or right",
                )
                continue
            side = side_raw
        if region not in BODY_REGION_SLUGS or subregion not in BODY_SUBREGION_SLUGS:
            log_warning(
                row_num,
                "bodySites",
                f"invalid site {segment!r} — skipped (use JSON slugs, e.g. arm > forearm > left)",
            )
            continue
        entry = {"region": region, "subregion": subregion, "side": side}
        if entry not in sites:
            sites.append(entry)
    return sites


def format_body_site_csv(site: dict) -> str:
    region = site.get("region")
    subregion = site.get("subregion")
    if not region or not subregion:
        return ""
    text = f"{region} > {subregion}"
    side = site.get("side")
    if side in BODY_SITE_SIDE_SLUGS:
        text = f"{text} > {side}"
    return text


def format_body_sites_csv(sites: list[dict]) -> str:
    parts = [format_body_site_csv(site) for site in sites]
    return ARRAY_ITEM_SEP.join(p for p in parts if p)


def format_number(value: float | int | None) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def paper_to_csv_row(paper: dict) -> dict[str, str]:
    row: dict[str, str] = {}
    for column in CSV_COLUMNS:
        value = paper.get(column)
        if column == "bodySites":
            row[column] = format_body_sites_csv(value or [])
        elif column in ARRAY_LIST_COLUMNS:
            row[column] = ARRAY_ITEM_SEP.join(value or [])
        elif column in NUMERIC_COLUMNS:
            row[column] = format_number(value)
        elif value is None:
            row[column] = ""
        else:
            row[column] = str(value)
    return row


def row_to_paper(row: list[str], fields: dict[str, int], row_num: int, paper_id: str) -> dict:
    doi = cell(row, fields, "doi")
    url = cell(row, fields, "url")
    if not url and doi:
        url = f"https://doi.org/{doi}"

    materials_in_contact = parse_slug_list(
        cell(row, fields, "materialsInContactWithSkin"),
        MATERIAL_SLUGS,
        "materialsInContactWithSkin",
        row_num,
    )

    return {
        "id": paper_id,
        "title": normalize_title(cell(row, fields, "title")),
        "authors": normalize_authors(cell(row, fields, "authors")),
        "publicationYear": parse_year(cell(row, fields, "publicationYear")),
        "publicationVenue": normalize_venue(cell(row, fields, "publicationVenue")),
        "doi": doi,
        "url": url or None,
        "abstract": normalize_preserving_text(cell(row, fields, "abstract")),
        "temperatureNotes": normalize_preserving_text(cell(row, fields, "temperatureNotes")),
        "ambientTempC": parse_number(cell(row, fields, "ambientTempC")),
        "minTempC": parse_number(cell(row, fields, "minTempC")),
        "maxTempC": parse_number(cell(row, fields, "maxTempC")),
        "durationNotes": normalize_preserving_text(cell(row, fields, "durationNotes")),
        "minDurationSec": parse_number(cell(row, fields, "minDurationSec")),
        "maxDurationSec": parse_number(cell(row, fields, "maxDurationSec")),
        "senses": finalize_senses(
            parse_slug_list(cell(row, fields, "senses"), SENSE_SLUGS, "senses", row_num)
        ),
        "thermalPerceptionMeasure": normalize_preserving_text(
            cell(row, fields, "thermalPerceptionMeasure")
        ),
        "thermalCuePurpose": normalize_preserving_text(cell(row, fields, "thermalCuePurpose")),
        "thermalTransferModes": parse_slug_list(
            cell(row, fields, "thermalTransferModes"),
            THERMAL_MODE_SLUGS,
            "thermalTransferModes",
            row_num,
        ),
        "mainActuatorForTemperatureSensation": normalize_optional_string(
            cell(row, fields, "mainActuatorForTemperatureSensation")
        ),
        "mainActuatorModel": normalize_optional_string(cell(row, fields, "mainActuatorModel")),
        "mainActuatorSize": normalize_optional_string(cell(row, fields, "mainActuatorSize")),
        "overallDeviceSize": normalize_optional_string(cell(row, fields, "overallDeviceSize")),
        "mainActuatorPossibleTemperatureRange": normalize_optional_string(
            cell(row, fields, "mainActuatorPossibleTemperatureRange")
        ),
        "otherSensoryActuators": split_free_text_list(cell(row, fields, "otherSensoryActuators")),
        "auxiliaryHardware": split_free_text_list(cell(row, fields, "auxiliaryHardware")),
        "heatControlMethod": normalize_optional_string(cell(row, fields, "heatControlMethod")),
        "powerConsumption": normalize_optional_string(cell(row, fields, "powerConsumption")),
        "temporalParameters": normalize_optional_string(cell(row, fields, "temporalParameters")),
        "otherNote": normalize_preserving_text(cell(row, fields, "otherNote")),
        "technicalSummary": normalize_preserving_text(cell(row, fields, "technicalSummary")),
        "materialsInContactWithSkin": materials_in_contact,
        "bodyPartsInvolved": normalize_preserving_text(cell(row, fields, "bodyPartsInvolved")),
        "bodySites": parse_body_sites(cell(row, fields, "bodySites"), row_num),
        "powerEnergyConsumption": normalize_optional_string(
            cell(row, fields, "powerEnergyConsumption")
        ),
    }


def load_csv_rows(csv_path: Path) -> tuple[dict[str, int], list[tuple[int, list[str]]]]:
    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    if not rows:
        print("ERROR: CSV is empty.", file=sys.stderr)
        sys.exit(1)

    fields = parse_header_row(rows[0])
    missing = missing_required_columns(fields)
    if missing:
        print(
            "ERROR: CSV header missing required column(s): " + ", ".join(missing),
            file=sys.stderr,
        )
        print(
            "Headers must match JSON keys exactly. See CSV_COLUMNS in papers_csv_schema.py",
            file=sys.stderr,
        )
        sys.exit(1)

    doi_idx = fields["doi"]
    data: list[tuple[int, list[str]]] = []
    for row_num, row in enumerate(rows[1:], start=2):
        if doi_idx < len(row) and row[doi_idx].strip().startswith("10."):
            data.append((row_num, row))
    return fields, data


def build_from_scratch(
    fields: dict[str, int],
    csv_rows: list[tuple[int, list[str]]],
) -> list[dict]:
    papers: list[dict] = []
    seen_dois: set[str] = set()
    doi_idx = fields["doi"]
    for sheet_row, row in csv_rows:
        doi = row[doi_idx].strip() if doi_idx < len(row) else ""
        if doi in seen_dois:
            print(
                f"WARNING: duplicate DOI {doi!r} at row {sheet_row}; skipping",
                file=sys.stderr,
            )
            continue
        seen_dois.add(doi)
        papers.append(row_to_paper(row, fields, sheet_row, str(len(papers) + 1)))
    return papers
