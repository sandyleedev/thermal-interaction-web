#!/usr/bin/env python3
"""Add explicit `side` to each bodySites entry in researchPapers.json."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "frontend" / "src" / "data" / "researchPapers.json"

BILATERAL_PARENTS = {"arm", "hand", "leg", "foot", "wrist", "ankle", "head"}

SUBREGION_KEYWORDS: dict[str, list[str]] = {
    "general": [],
    "forearm": ["forearm", "fore arm", "lower arm"],
    "upper-arm": ["upper arm", "upper-arm", "upperarm"],
    "upper arm": ["upper arm", "upper-arm", "upperarm"],
    "palm": ["palm", "heel of the palm"],
    "fingertips": ["fingertip", "finger tip", "finger tips", "distal phalan"],
    "fingers": ["finger", "fingers", "index", "thumb", "middle finger"],
    "thenar-eminence": ["thenar"],
    "hand-back": ["hand back", "dorsal", "back of"],
    "sole": ["sole", "bottom of the feet", "heel side"],
    "toes": ["toe", "toes"],
    "thigh": ["thigh"],
    "crural": ["crural", "calf", "lower leg", "shin"],
    "crural-region": ["crural", "calf", "lower leg", "shin"],
    "ear": ["ear", "auricular", "tragus", "sideburn"],
    "cheek": ["cheek"],
    "ventral": ["ventral", "inner"],
    "dorsal": ["dorsal", "outer"],
    "ankle": ["ankle"],
}

PARENT_KEYWORDS: dict[str, list[str]] = {
    "arm": ["arm", "forearm", "upper arm"],
    "hand": ["hand", "palm", "finger", "fingertip", "thumb"],
    "foot": ["foot", "feet", "sole", "toe"],
    "leg": ["leg", "thigh", "calf", "crural"],
    "wrist": ["wrist"],
    "ankle": ["ankle"],
    "head": ["head", "ear", "cheek", "forehead", "face"],
}


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def keywords_for_site(region: str, subregion: str) -> list[str]:
    region_l = region.strip().lower()
    sub_l = subregion.strip().lower()
    keys = list(PARENT_KEYWORDS.get(region_l, [region_l.replace("-", " ")]))
    keys.extend(SUBREGION_KEYWORDS.get(sub_l, [sub_l.replace("-", " ")]))
    return [k for k in keys if k]


def mentions_both(text: str, keywords: list[str]) -> bool:
    if "both" not in text:
        return False
    return any(k in text for k in keywords)


def lateral_mentions(text: str, side: str, keywords: list[str]) -> bool:
    # Ignore handedness phrases — not lateral body-site labels.
    scrubbed = re.sub(rf"\b{side}-handed\b", "", text)
    patterns = [
        rf"\b{side}\b[^\n.]{{0,40}}(?:{'|'.join(re.escape(k) for k in keywords)})",
        rf"(?:{'|'.join(re.escape(k) for k in keywords)})[^\n.]{{0,40}}\b{side}\b",
        rf"\b{side}\s+(?:side|hand|arm|foot|leg|ear|cheek|wrist|ankle|thigh)\b",
        rf"\b{side}\s+(?:index|middle|fore|upper)\b",
    ]
    return any(re.search(p, scrubbed) for p in patterns)


def infer_side(text: str, region: str, subregion: str) -> str | None:
    region_l = region.strip().lower()
    if region_l not in BILATERAL_PARENTS:
        return None

    sub_l = subregion.strip().lower()
    if region_l == "head" and sub_l not in {"ear", "cheek"}:
        return None

    t = normalize(text)
    if not t or t in {"n/a", "na"}:
        return None

    keys = keywords_for_site(region_l, sub_l)

    if mentions_both(t, keys):
        return None

    left = lateral_mentions(t, "left", keys)
    right = lateral_mentions(t, "right", keys)

    if left and not right:
        return "left"
    if right and not left:
        return "right"

    return None


def main() -> None:
    papers = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    changed = 0
    for paper in papers:
        note = paper.get("bodyPartsInvolved") or ""
        for site in paper.get("bodySites") or []:
            side = infer_side(note, site.get("region", ""), site.get("subregion", ""))
            if site.get("side") != side:
                changed += 1
            site["side"] = side
    JSON_PATH.write_text(
        json.dumps(papers, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Updated {JSON_PATH.name}: {changed} side field(s) set/changed across {len(papers)} papers.")


if __name__ == "__main__":
    main()
