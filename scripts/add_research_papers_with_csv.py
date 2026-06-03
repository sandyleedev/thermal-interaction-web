#!/usr/bin/env python3
"""Append new papers from CSV to researchPapers.json (existing DOIs are left unchanged)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from papers_csv_schema import (
    INFERENCE_LOG,
    JSON_PATH,
    load_csv_rows,
    row_to_paper,
)

ROOT = Path(__file__).resolve().parents[1]


def load_existing_json(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def existing_doi_set(papers: list[dict]) -> set[str]:
    dois: set[str] = set()
    for paper in papers:
        doi = (paper.get("doi") or "").strip()
        if doi.startswith("10."):
            dois.add(doi)
    return dois


def next_paper_id(papers: list[dict]) -> int:
    ids = [int(p["id"]) for p in papers if str(p.get("id", "")).isdigit()]
    return (max(ids) if ids else 0) + 1


def write_json(path: Path, papers: list[dict]) -> None:
    path.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        type=Path,
        required=True,
        help="CSV with JSON property names; only new DOIs are appended",
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=JSON_PATH,
        help=f"JSON path (default: {JSON_PATH.relative_to(ROOT)})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be added without writing JSON",
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

    papers = load_existing_json(json_path)
    known_dois = existing_doi_set(papers)
    fields, csv_rows = load_csv_rows(csv_path)

    next_id = next_paper_id(papers)
    added: list[dict] = []
    skipped = 0
    duplicate_in_csv = 0
    seen_in_csv: set[str] = set()

    doi_idx = fields["doi"]
    for sheet_row, row in csv_rows:
        doi = row[doi_idx].strip() if doi_idx < len(row) else ""
        if doi in seen_in_csv:
            duplicate_in_csv += 1
            print(
                f"WARNING: duplicate DOI {doi!r} at row {sheet_row}; skipping",
                file=sys.stderr,
            )
            continue
        seen_in_csv.add(doi)

        if doi in known_dois:
            skipped += 1
            continue

        paper = row_to_paper(row, fields, sheet_row, str(next_id))
        papers.append(paper)
        added.append(paper)
        known_dois.add(doi)
        next_id += 1

    print(f"CSV source: {csv_path}")
    print(f"Columns mapped: {len(fields)}")
    print(f"Rows in CSV (valid DOI): {len(csv_rows)}")
    print(f"Already in JSON (skipped): {skipped}")
    if duplicate_in_csv:
        print(f"Duplicate DOIs in CSV (skipped): {duplicate_in_csv}")
    print(f"New papers to add: {len(added)}")

    for paper in added:
        print(f"  + id {paper['id']}: {paper.get('title', paper.get('doi'))[:70]}")

    if args.dry_run:
        print("Dry run — JSON not modified.")
        sys.exit(0)

    if not added:
        print("Nothing to add.")
        sys.exit(0)

    write_json(json_path, papers)
    print(f"Wrote {json_path} ({len(papers)} papers total).")

    if INFERENCE_LOG:
        print(f"\nWarnings ({len(INFERENCE_LOG)} entries):")
        for note in INFERENCE_LOG[:40]:
            print(f"  - {note}")
        if len(INFERENCE_LOG) > 40:
            print(f"  ... and {len(INFERENCE_LOG) - 40} more")


if __name__ == "__main__":
    main()
