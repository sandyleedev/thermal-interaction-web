#!/usr/bin/env python3
"""Import research papers from ACM CSV into researchPapers.json (full rebuild)."""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "frontend" / "src" / "data" / "researchPapers.json"

# Column indices (from TSV header row)
COL = {
    "year": 0,
    "venue": 1,
    "authors": 2,
    "title": 3,
    "doi": 4,
    "url": 5,
    "ambient": 7,
    "temp_min": 9,
    "temp_max": 10,
    "dur_min": 14,
    "dur_max": 15,
    "senses": 17,
    "thermal_measure": 18,
    "purpose": 23,
    "thermal_modes": 28,
    "main_actuator": 30,
    "actuator_model": 31,
    "actuator_size": 32,
    "device_size": 33,
    "temp_range": 34,
    "other_actuators": 35,
    "aux_hw": 36,
    "heat_control": 37,
    "power": 38,
    "temporal": 39,
    "other_note": 40,
    "tech_summary": 41,
    "materials_skin": 43,
    "materials_filter": 44,
    "body_parts_involved": 45,
    "body_main_sub": 47,
    "energy": 51,
}

NULLISH = {
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
}

NULLISH_PREFIX_RE = re.compile(
    r"^(?:n/a|na|not reported|not specified|not applicable)\s*[.:;,\-—]?\s*",
    re.IGNORECASE,
)

SENSE_TOKEN_MAP = {
    "thermal": "thermal-alone",
    "temperature": "thermal-alone",
    "themal": "thermal-alone",
    "tactile": "haptic-tactile",
    "vibrotactile": "haptic-tactile",
    "haptic": "haptic-tactile",
    "force": "haptic-force",
    "pressure": "haptic-force",
    "compression": "haptic-force",
    "visual": "visual",
    "auditory": "auditory",
    "olfactory": "olfactory",
    "ofatoryl": "olfactory",
    "gustatory": "gustatory",
    "trigeminal": "trigeminal-nerve",
    "kinesthetic": "kinesthetic-motion",
    "motion": "kinesthetic-motion",
    "body": "body-general",
}

THERMAL_ALONE_SENSE = "thermal-alone"


def finalize_senses(slugs: list[str]) -> list[str]:
    """thermal-alone only when no other sense tags are present."""
    if THERMAL_ALONE_SENSE in slugs and len(slugs) > 1:
        return [s for s in slugs if s != THERMAL_ALONE_SENSE]
    return slugs

MATERIAL_TOKEN_MAP = {
    "metal": "metal",
    "ceramic": "ceramic",
    "fabrics & textiles": "fabrics-textiles",
    "latex": "latex",
    "polymers & synthetics": "polymers-synthetics",
    "silicone-based": "silicone-based",
    "foam & cushioning": "foam-cushioning",
    "liquids & gels": "liquids-gels",
    "air / gas": "air-gas",
    "chemical": "chemical",
}

THERMAL_MODE_MAP = {
    "conduction": "conduction",
    "radiation": "radiation",
    "convection": "convection",
    "chemical": "chemical",
}

REGION_MAP = {
    "whole body": "wholeBody",
    "arm": "arm",
    "hand": "hand",
    "head": "head",
    "neck": "neck",
    "torso": "torso",
    "wrist": "wrist",
    "foot": "foot",
    "leg": "leg",
    "ankle": "ankle",
    "gluteal": "gluteal",
    "gluteal region": "gluteal",
    "buttocks": "gluteal",
}

SUBREGION_MAP = {
    "general": "general",
    "forearm": "forearm",
    "upper arm": "upper-arm",
    "hand back": "hand-back",
    "fingertips": "fingertips",
    "fingers": "fingers",
    "palm": "palm",
    "thenar eminence": "thenar-eminence",
    "sole": "sole",
    "shoulder": "shoulder",
    "chest": "chest",
    "abdomen": "abdomen",
    "back": "back",
    "nose": "nose",
    "ear": "ear",
    "forehead": "forehead",
    "cheek": "cheek",
    "lip": "lip",
    "tongue": "tongue",
    "crural region": "crural-region",
    "thigh": "thigh",
    "posterior": "posterior",
    "anterior": "anterior",
    "ventral": "ventral",
    "dorsal": "dorsal",
}

INFERENCE_LOG: list[str] = []


def log_inference(row_num: int, column: str, detail: str) -> None:
    INFERENCE_LOG.append(f"Row {row_num}, column '{column}': {detail}")


def cell(row: list[str], key: str) -> str:
    idx = COL[key]
    if idx >= len(row):
        return ""
    return row[idx].strip()


def is_nullish(value: str) -> bool:
    return value.strip().lower() in NULLISH


def parse_number(value: str) -> float | None:
    if is_nullish(value):
        return None
    cleaned = value.strip().replace(",", ".")
    # Single number only — reject ranges and compound text
    if re.search(r"[^\d.\-+eE\s]", cleaned.replace(" ", "")):
        # Allow leading minus and one decimal point only
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


def parse_ambient(value: str, row_num: int) -> float | None:
    if is_nullish(value):
        return None
    # Pure numeric or simple decimal
    m = re.fullmatch(r"-?\d+(?:\.\d+)?", value.strip().replace(",", "."))
    if m:
        return float(m.group(0))
    log_inference(row_num, "Ambient temperature", f"left null (non-scalar value: {value[:80]!r})")
    return None


def parse_year(value: str) -> int | None:
    m = re.search(r"\b(19|20)\d{2}\b", value)
    return int(m.group(0)) if m else None


def normalize_venue(value: str) -> str:
    v = value.strip()
    if not v:
        return v
    # publicationYear holds the year; strip trailing venue-year suffixes like "'24" or " 2024".
    v = re.sub(r"\s+'\d{2}$", "", v)
    v = re.sub(r"\s+\d{4}$", "", v)
    return v.strip()


def normalize_authors(value: str) -> str:
    """Use `Family, Given; Family, Given` (ACM-style) consistently."""
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
    """Missing hardware/spec values → JSON null."""
    v = value.strip()
    if is_nullish(v):
        return None
    return v


def normalize_preserving_text(value: str) -> str | None:
    """Long text: null when empty; strip leading N/A-style prefixes when notes follow."""
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


def split_items(value: str) -> list[str]:
    if is_nullish(value):
        return []
    parts: list[str] = []
    for chunk in re.split(r"[\n;]+", value):
        for piece in chunk.split(","):
            p = piece.strip()
            if p and not is_nullish(p):
                parts.append(p)
    return parts


def map_senses(value: str, row_num: int) -> list[str]:
    if is_nullish(value):
        return []
    if value.strip().lower() == "all senses":
        log_inference(row_num, "Multisensory perception (simplify)", "mapped 'All senses' to empty list (no explicit token list)")
        return []
    tokens: list[str] = []
    for line in re.split(r"[\n/]+", value):
        line = line.strip()
        if not line:
            continue
        low = line.lower()
        mapped = None
        for key, slug in SENSE_TOKEN_MAP.items():
            if key in low:
                mapped = slug
                break
        if mapped:
            if mapped not in tokens:
                tokens.append(mapped)
        else:
            log_inference(row_num, "Multisensory perception (simplify)", f"unmapped token {line!r} — skipped")
    return finalize_senses(tokens)


def map_materials(value: str) -> list[str]:
    if is_nullish(value):
        return []
    out: list[str] = []
    for part in re.split(r"[,;\n]+", value):
        key = part.strip().lower()
        if not key or key in NULLISH:
            continue
        slug = MATERIAL_TOKEN_MAP.get(key)
        if slug and slug not in out:
            out.append(slug)
    return out


def map_thermal_modes(value: str) -> list[str]:
    if is_nullish(value):
        return []
    out: list[str] = []
    for part in re.split(r"[,;\n]+", value):
        key = part.strip().lower()
        if not key or key in NULLISH:
            continue
        slug = THERMAL_MODE_MAP.get(key)
        if slug and slug not in out:
            out.append(slug)
    return out


def parse_body_sites(value: str, row_num: int) -> list[dict]:
    if is_nullish(value):
        return []
    sites: list[dict] = []
    # Split on semicolons first, then commas between site pairs
    segments: list[str] = []
    for part in re.split(r";", value):
        part = part.strip()
        if not part:
            continue
        if part.count(">") > 1:
            # e.g. "Hand > Palm, Hand > Fingers"
            segments.extend(s.strip() for s in part.split(",") if ">" in s)
        else:
            segments.append(part)
    for segment in segments:
        if ">" not in segment:
            log_inference(row_num, "Body parts (Main > Sub)", f"skipped segment without '>': {segment!r}")
            continue
        parent_raw, sub_raw = segment.split(">", 1)
        parent_key = REGION_MAP.get(parent_raw.strip().lower())
        sub_key = SUBREGION_MAP.get(sub_raw.strip().lower())
        if not parent_key or not sub_key:
            log_inference(
                row_num,
                "Body parts (Main > Sub)",
                f"unmapped site {segment!r} (parent={parent_raw.strip()!r}, sub={sub_raw.strip()!r})",
            )
            continue
        entry = {"region": parent_key, "subregion": sub_key, "side": None}
        if entry not in sites:
            sites.append(entry)
    return sites


def row_to_paper(row: list[str], row_num: int, paper_id: str) -> dict:
    doi = cell(row, "doi")
    url = cell(row, "url")
    if not url and doi:
        url = f"https://doi.org/{doi}"

    min_c = parse_number(cell(row, "temp_min"))
    max_c = parse_number(cell(row, "temp_max"))
    dur_min = parse_number(cell(row, "dur_min"))
    dur_max = parse_number(cell(row, "dur_max"))

    materials_filter = map_materials(cell(row, "materials_filter"))
    materials_skin = map_materials(cell(row, "materials_skin"))
    if not materials_skin and materials_filter:
        materials_skin = list(materials_filter)

    body_sites = parse_body_sites(cell(row, "body_main_sub"), row_num)

    return {
        "id": paper_id,
        "title": normalize_title(cell(row, "title")),
        "authors": normalize_authors(cell(row, "authors")),
        "publicationYear": parse_year(cell(row, "year")),
        "publicationVenue": normalize_venue(cell(row, "venue")),
        "doi": doi,
        "url": url or None,
        "ambientTempC": parse_ambient(cell(row, "ambient"), row_num),
        "minTempC": min_c,
        "maxTempC": max_c,
        "minDurationSec": dur_min,
        "maxDurationSec": dur_max,
        "senses": map_senses(cell(row, "senses"), row_num),
        "thermalPerceptionMeasure": normalize_preserving_text(cell(row, "thermal_measure")),
        "thermalCuePurpose": normalize_preserving_text(cell(row, "purpose")),
        "thermalTransferModes": map_thermal_modes(cell(row, "thermal_modes")),
        "mainActuatorForTemperatureSensation": normalize_optional_string(cell(row, "main_actuator")),
        "mainActuatorModel": normalize_optional_string(cell(row, "actuator_model")),
        "mainActuatorSize": normalize_optional_string(cell(row, "actuator_size")),
        "overallDeviceSize": normalize_optional_string(cell(row, "device_size")),
        "mainActuatorPossibleTemperatureRange": normalize_optional_string(cell(row, "temp_range")),
        "otherSensoryActuators": split_items(cell(row, "other_actuators")),
        "auxiliaryHardware": split_items(cell(row, "aux_hw")),
        "heatControlMethod": normalize_optional_string(cell(row, "heat_control")),
        "powerConsumption": normalize_optional_string(cell(row, "power")),
        "temporalParameters": normalize_optional_string(cell(row, "temporal")),
        "otherNote": normalize_preserving_text(cell(row, "other_note")),
        "technicalSummary": normalize_preserving_text(cell(row, "tech_summary")),
        "materialsInContactWithSkin": materials_skin,
        "materials": materials_filter,
        "bodyPartsInvolved": normalize_preserving_text(cell(row, "body_parts_involved")),
        "bodySites": body_sites,
        "powerEnergyConsumption": normalize_optional_string(cell(row, "energy")),
    }


def preserve_body_sides(existing: dict, incoming: dict) -> None:
    old_sites = {
        (s.get("region"), s.get("subregion")): s.get("side")
        for s in existing.get("bodySites") or []
    }
    for site in incoming.get("bodySites") or []:
        key = (site.get("region"), site.get("subregion"))
        if key in old_sites:
            site["side"] = old_sites[key]


def merge_paper(existing: dict, incoming: dict, row_num: int) -> tuple[dict, list[str]]:
    """Return merged paper and list of changed field names."""
    preserve_body_sides(existing, incoming)
    merged = dict(existing)
    changed: list[str] = []
    for key, new_val in incoming.items():
        old_val = existing.get(key)
        if old_val != new_val:
            merged[key] = new_val
            changed.append(key)
    return merged, changed


def load_csv_rows(csv_path: Path) -> list[tuple[int, list[str]]]:
    """Return (spreadsheet row number, row cells) for rows with a valid DOI."""
    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    data: list[tuple[int, list[str]]] = []
    for row_num, row in enumerate(rows[1:], start=2):
        if len(row) > COL["doi"] and row[COL["doi"]].strip().startswith("10."):
            data.append((row_num, row))
    return data


def build_from_scratch(csv_rows: list[tuple[int, list[str]]]) -> list[dict]:
    papers: list[dict] = []
    for seq_id, (sheet_row, row) in enumerate(csv_rows, start=1):
        papers.append(row_to_paper(row, sheet_row, str(seq_id)))
    return papers


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rebuild researchPapers.json from an ACM spreadsheet CSV export.",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        required=True,
        help="Path to the data-cleaning CSV (e.g. ~/Downloads/ACM examples.xlsx - data cleaning.csv)",
    )
    args = parser.parse_args()
    csv_path = args.csv.expanduser().resolve()
    if not csv_path.is_file():
        print(f"ERROR: CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    csv_rows = load_csv_rows(csv_path)
    ordered = build_from_scratch(csv_rows)

    JSON_PATH.write_text(
        json.dumps(ordered, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    infer_script = ROOT / "scripts" / "infer_body_site_sides.py"
    subprocess.run([sys.executable, str(infer_script)], check=True)

    skipped = max(0, 94 - len(csv_rows))
    print(f"CSV source: {csv_path}")
    print(f"Rows with valid DOI: {len(csv_rows)}")
    print(f"Rows skipped (no valid DOI): {skipped}")
    print(f"Total papers in JSON: {len(ordered)}")

    if INFERENCE_LOG:
        print(f"\nInference / non-literal parsing notes ({len(INFERENCE_LOG)} entries):")
        for note in INFERENCE_LOG[:40]:
            print(f"  - {note}")
        if len(INFERENCE_LOG) > 40:
            print(f"  ... and {len(INFERENCE_LOG) - 40} more")


if __name__ == "__main__":
    main()
