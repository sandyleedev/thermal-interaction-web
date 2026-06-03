#!/usr/bin/env python3
"""Replace researchPapers.json from a header-row CSV.

CSV is the full dataset (replace, not merge). Papers in JSON whose DOI is not in the
CSV are dropped. Review git diff before commit.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from papers_csv_schema import (
    INFERENCE_LOG,
    JSON_PATH,
    build_from_scratch,
    load_csv_rows,
)

ROOT = Path(__file__).resolve().parents[1]


def load_existing_json(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def csv_doi_set(fields: dict[str, int], csv_rows: list[tuple[int, list[str]]]) -> set[str]:
    doi_idx = fields["doi"]
    dois: set[str] = set()
    for _, row in csv_rows:
        if doi_idx < len(row):
            doi = row[doi_idx].strip()
            if doi.startswith("10."):
                dois.add(doi)
    return dois


def count_removed(existing: list[dict], csv_dois: set[str]) -> int:
    count = 0
    for paper in existing:
        doi = (paper.get("doi") or "").strip()
        if doi.startswith("10.") and doi not in csv_dois:
            count += 1
    return count


def write_json(path: Path, papers: list[dict]) -> None:
    path.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        type=Path,
        required=True,
        help="CSV header row must use JSON property names (see CSV_COLUMNS)",
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=JSON_PATH,
        help=f"Output JSON path (default: {JSON_PATH.relative_to(ROOT)})",
    )
    args = parser.parse_args()

    csv_path = args.csv.expanduser().resolve()
    json_path = args.json.expanduser().resolve()
    if not csv_path.is_file():
        print(f"ERROR: CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(1)
    if not json_path.is_file():
        print(f"ERROR: JSON not found: {json_path}", file=sys.stderr)
        sys.exit(1)

    existing = load_existing_json(json_path)
    fields, csv_rows = load_csv_rows(csv_path)
    csv_dois = csv_doi_set(fields, csv_rows)
    removed_count = count_removed(existing, csv_dois)

    ordered = build_from_scratch(fields, csv_rows)
    write_json(json_path, ordered)

    print(f"CSV source: {csv_path}")
    print(f"Columns mapped: {len(fields)}")
    print(f"Rows in CSV (valid DOI): {len(csv_rows)}")
    print(f"Previously in JSON: {len(existing)}")
    print(f"Removed (not in CSV): {removed_count}")
    print(f"Now in JSON: {len(ordered)}")

    if INFERENCE_LOG:
        print(f"\nWarnings ({len(INFERENCE_LOG)} entries):")
        for note in INFERENCE_LOG[:40]:
            print(f"  - {note}")
        if len(INFERENCE_LOG) > 40:
            print(f"  ... and {len(INFERENCE_LOG) - 40} more")


if __name__ == "__main__":
    main()
