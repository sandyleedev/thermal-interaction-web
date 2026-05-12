/**
 * L1 body map geometry from `src/assets/body-map/body-silhouette-parts.svg`
 * (kept in sync with `public/body-map/body-silhouette-parts.svg` for direct URL use).
 *
 * Inkscape `inkscape:label` values are grouped into merged SVG hit regions (`BodyMapRegion`).
 * The "Base" path is the full silhouette outline (clip + stroke), not a hover part.
 */

import rawSvg from "@/assets/body-map/body-silhouette-parts.svg?raw";
import type { BodyMapRegion } from "@/lib/research/researchPapers";

export type SilhouetteBodySubpath = { d: string; transform?: string; label: string };

export type SilhouetteBodyPart = {
  id: BodyMapRegion;
  label: string;
  subpaths: SilhouetteBodySubpath[];
};

/** Parsed once on first read (browser only — uses DOMParser). */
let cache: {
  view: { x: number; y: number; w: number; h: number };
  outlinePathD: string;
  parts: readonly SilhouetteBodyPart[];
} | null = null;

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
    labels: ["Torso", "RightShoulder", "LeftShoulder", "Chest", "Abdomen"],
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
  { id: "ankle", label: "Ankle", labels: ["LeftAnkle", "RightAnkle"] },
  /** Source file typo: "RIghtFoot" — keep both spellings. */
  { id: "foot", label: "Foot", labels: ["LeftFoot", "RIghtFoot"] },
];

function inkscapeLabel(el: Element): string {
  return (
    el.getAttribute("inkscape:label") ??
    el.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label") ??
    ""
  );
}

function parseSilhouette(): {
  view: { x: number; y: number; w: number; h: number };
  outlinePathD: string;
  parts: readonly SilhouetteBodyPart[];
} {
  if (typeof DOMParser === "undefined") {
    throw new Error(
      "bodyMapSilhouetteAsset: DOMParser is missing (expected browser).",
    );
  }
  const doc = new DOMParser().parseFromString(rawSvg, "image/svg+xml");
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
    const lab = inkscapeLabel(el);
    if (lab === "Base") {
      outlinePathD = d.trim();
      return;
    }
    if (lab) dByLabel.set(lab, d.trim());
  });

  if (!outlinePathD) {
    throw new Error(
      'bodyMapSilhouetteAsset: no path with inkscape:label="Base" found.',
    );
  }

  const parts: SilhouetteBodyPart[] = [];
  for (const cfg of PART_INKSCAPE_LABELS) {
    const subpaths: SilhouetteBodySubpath[] = [];
    for (const lab of cfg.labels) {
      const d = dByLabel.get(lab);
      if (d) subpaths.push({ d, label: lab });
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

export function getBodySilhouetteAsset(): {
  view: { x: number; y: number; w: number; h: number };
  outlinePathD: string;
  parts: readonly SilhouetteBodyPart[];
} {
  cache ??= parseSilhouette();
  return cache;
}
