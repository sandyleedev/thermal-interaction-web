/**
 * L1 body map geometry from `public/body-map/body-silhouette-parts.svg`
 * (loaded at runtime; add new map SVGs under `public/body-map/` the same way).
 *
 * Inkscape `inkscape:label` values are grouped into merged SVG hit regions (`BodyMapRegion`).
 * The "Base" path is the full silhouette outline (clip + stroke), not a hover part.
 */

import type { BodyMapRegion } from "@/lib/research/researchPapers";
import { BODY_MAP_REGIONS } from "@/lib/research/bodyMapRegions";

const SILHOUETTE_URL = "/body-map/body-silhouette-parts.svg?v=4";

export type SilhouetteBodySubpath = { d: string; transform?: string; label: string };

export type SilhouetteBodyPart = {
  id: BodyMapRegion;
  label: string;
  subpaths: SilhouetteBodySubpath[];
};

type ParsedSilhouette = {
  view: { x: number; y: number; w: number; h: number };
  outlinePathD: string;
  parts: readonly SilhouetteBodyPart[];
};

let cache: ParsedSilhouette | null = null;
let inflight: Promise<void> | null = null;

/**
 * Maps Inkscape layer labels from the source SVG to merged L1 parts.
 * Order within each array is preserved for stable L/R pairing (left-ish paths first where applicable).
 */
const PART_INKSCAPE_LABELS: {
  id: BodyMapRegion;
  label: string;
  labels: readonly string[];
}[] = [
  {
    id: "head",
    label: "Head",
    labels: [
      "Head",
      "RightEar",
      "LeftEar",
      "Forehead",
      "Lip",
      "RightCheek",
      "LeftCheek",
      "Nose",
    ],
  },
  { id: "neck", label: "Neck", labels: ["Neck"] },
  {
    id: "torso",
    label: "Torso",
    labels: [
      "Torso",
      "RightShoulder",
      "LeftShoulder",
      "Chest",
      "Abdomen",
      /* Illustrator export: shoulder / midriff fragments without inkscape labels */
      "path37",
      "path32",
      "path33",
      "path41",
      "path42",
    ],
  },
  {
    id: "arm",
    label: "Arm",
    labels: [
      "LeftArm",
      "RightArm",
      "LeftUpperArm",
      "LeftForeArm",
      "RightUpperArm",
      "RightForeArm",
    ],
  },
  { id: "wrist", label: "Wrist", labels: ["LeftWrist", "RightWrist"] },
  { id: "hand", label: "Hand", labels: ["LeftHand", "RightHand"] },
  {
    id: "leg",
    label: "Leg",
    labels: [
      "LeftLeg",
      "RightLeg",
      "LeftThigh",
      "RightThigh",
      "LeftCrural",
      "RightCrural",
    ],
  },
  {
    id: "gluteal",
    label: "Gluteal",
    labels: ["GlutealRegion"],
  },
  { id: "ankle", label: "Ankle", labels: ["LeftAnkle", "RightAnkle"] },
  /** Inkscape typo "RIghtFoot"; Illustrator uses `RightFoot`. */
  { id: "foot", label: "Foot", labels: ["LeftFoot", "RIghtFoot", "RightFoot"] },
];

/** Leg SVG paths overlapping the gluteal zone — excluded from leg hit targets. */
export const LEG_LABELS_DEFERRED_TO_GLUTEAL_HITS = new Set([
  "LeftLeg",
  "RightLeg",
  "LeftThigh",
  "RightThigh",
]);

export function hitSubpathsForBodyPart(
  part: {
    id: BodyMapRegion;
    subpaths: readonly { d: string; transform?: string; label?: string }[];
  },
): { d: string; transform?: string; label?: string }[] {
  if (part.id === "gluteal") return [...part.subpaths];
  if (part.id === "leg") {
    return part.subpaths.filter(
      (subpath) =>
        !subpath.label ||
        !LEG_LABELS_DEFERRED_TO_GLUTEAL_HITS.has(subpath.label),
    );
  }
  return [...part.subpaths];
}

/** Inkscape label if present, otherwise `id` (Illustrator / cleaned exports). */
function pathRegionKey(el: Element): string {
  const ink =
    el.getAttribute("inkscape:label") ??
    el.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") ??
    "";
  const trimmedInk = ink.trim();
  if (trimmedInk) return trimmedInk;
  return el.getAttribute("id")?.trim() ?? "";
}

/** One SVG path element may contain multiple subpaths (`M … z M …`). Split for hit-testing. */
function splitCompoundPathD(d: string): string[] {
  const trimmed = d.trim();
  if (!trimmed) return [];
  const segments = trimmed
    .split(/(?=M)/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments : [trimmed];
}

function silhouetteCacheIsValid(
  parsed: ParsedSilhouette | null,
): parsed is ParsedSilhouette {
  if (!parsed) return false;
  const ids = new Set(parsed.parts.map((part) => part.id));
  return BODY_MAP_REGIONS.every((id) => ids.has(id));
}

function parseSilhouette(svgText: string): ParsedSilhouette {
  if (typeof DOMParser === "undefined") {
    throw new Error(
      "bodyMapSilhouetteAsset: DOMParser is missing (expected browser).",
    );
  }
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  const vb = (svg?.getAttribute("viewBox") ?? "0 0 837.483 1819.369").split(
    /[\s,]+/,
  );
  const view = {
    x: Number(vb[0]) || 0,
    y: Number(vb[1]) || 0,
    w: Number(vb[2]) || 837.483,
    h: Number(vb[3]) || 1819.369,
  };

  const dByLabel = new Map<string, string>();
  let outlinePathD = "";

  doc.querySelectorAll("path").forEach((el) => {
    const d = el.getAttribute("d");
    if (!d?.trim()) return;
    const key = pathRegionKey(el);
    if (key === "Base") {
      outlinePathD = d.trim();
      return;
    }
    if (key) dByLabel.set(key, d.trim());
  });

  if (!outlinePathD) {
    throw new Error(
      'bodyMapSilhouetteAsset: no outline path (inkscape:label or id="Base").',
    );
  }

  const parts: SilhouetteBodyPart[] = [];
  for (const cfg of PART_INKSCAPE_LABELS) {
    const subpaths: SilhouetteBodySubpath[] = [];
    for (const lab of cfg.labels) {
      const d = dByLabel.get(lab);
      if (!d) continue;
      if (lab === "GlutealRegion") {
        const segments = splitCompoundPathD(d);
        if (segments.length > 1) {
          segments.forEach((segmentD) => {
            subpaths.push({
              d: segmentD,
              label: "GlutealRegion",
            });
          });
          continue;
        }
      }
      subpaths.push({ d, label: lab });
    }
    if (subpaths.length === 0) {
      throw new Error(
        `bodyMapSilhouetteAsset: part "${cfg.id}" has no matching path labels.`,
      );
    }
    parts.push({ id: cfg.id, label: cfg.label, subpaths });
  }

  return { view, outlinePathD, parts };
}

/** Fetches and parses the silhouette SVG once; safe to call from multiple components. */
export function loadBodySilhouetteAsset(): Promise<void> {
  if (!silhouetteCacheIsValid(cache)) {
    cache = null;
    inflight = null;
  }
  if (silhouetteCacheIsValid(cache)) return Promise.resolve();
  inflight ??= (async () => {
    const res = await fetch(SILHOUETTE_URL);
    if (!res.ok) {
      throw new Error(
        `bodyMapSilhouetteAsset: failed to load ${SILHOUETTE_URL} (HTTP ${res.status}).`,
      );
    }
    const text = await res.text();
    cache = parseSilhouette(text);
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function getBodySilhouetteAsset(): {
  view: { x: number; y: number; w: number; h: number };
  outlinePathD: string;
  parts: readonly SilhouetteBodyPart[];
} {
  if (!cache) {
    throw new Error(
      "getBodySilhouetteAsset: call await loadBodySilhouetteAsset() before reading geometry.",
    );
  }
  return cache;
}
