#!/usr/bin/env python3
"""Export researchPapers.json to CSV (column names and slugs match JSON)."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from papers_csv_schema import CSV_COLUMNS, JSON_PATH, paper_to_csv_row

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=ROOT / "scripts" / "papers.sample.csv",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=3,
        help="Number of papers (default 3). Use 0 for all.",
    )
    args = parser.parse_args()

    papers: list[dict] = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    subset = papers if args.limit == 0 else papers[: args.limit]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    # UTF-8 BOM helps Excel open special characters (Ω, °, …) correctly.
    with args.output.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for paper in subset:
            writer.writerow(paper_to_csv_row(paper))

    print(f"Wrote {len(subset)} row(s) to {args.output}")


if __name__ == "__main__":
    main()
