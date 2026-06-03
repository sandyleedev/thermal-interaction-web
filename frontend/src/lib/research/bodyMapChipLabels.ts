import type { BodyMapChipSelection } from "@/lib/research/bodyMapChipSelection";
import {
  BODY_MAP_PARENT_REGIONS,
  BODY_MAP_REGIONS,
  type BodyMapParentRegion,
} from "@/lib/research/bodyMapRegions";

/** L1 regions that open a zoomed detail map. */
export const BODY_MAP_DETAIL_REGIONS = new Set<BodyMapParentRegion>([
  "head",
  "neck",
  "torso",
  "arm",
  "hand",
  "foot",
  "leg",
]);

const PARENT_CHIP_LABEL: Record<BodyMapParentRegion, string> = {
  "whole-body": "General",
  head: "Head",
  neck: "Neck",
  torso: "Torso",
  arm: "Arm",
  wrist: "Wrist",
  hand: "Hand",
  leg: "Leg",
  gluteal: "Gluteal",
  ankle: "Ankle",
  foot: "Foot",
};

const SUBPART_CHIP_LABEL: Partial<
  Record<BodyMapParentRegion, Record<string, string>>
> = {
  head: {
    forehead: "Forehead",
    nose: "Nose",
    lip: "Lip",
    tongue: "Tongue",
    ear: "Ear",
    cheek: "Cheek",
    "left-ear": "Ear (left)",
    "right-ear": "Ear (right)",
    "left-cheek": "Cheek (left)",
    "right-cheek": "Cheek (right)",
  },
  neck: {
    anterior: "Anterior neck",
    posterior: "Posterior neck",
  },
  torso: {
    chest: "Chest",
    abdomen: "Abdomen",
    shoulder: "Shoulder",
    "left-shoulder": "Shoulder (left)",
    "right-shoulder": "Shoulder (right)",
    back: "Back",
  },
  arm: {
    general: "General",
    "upper-arm": "Upper arm",
    forearm: "Forearm",
  },
  wrist: {
    general: "General",
    ventral: "Ventral",
    dorsal: "Dorsal",
  },
  hand: {
    general: "General",
    palm: "Palm",
    fingertips: "Fingertips",
    fingers: "Fingers",
    "thenar-eminence": "Thenar eminence",
    "hand-back": "Hand back",
  },
  leg: {
    general: "General",
    thigh: "Thigh",
    crural: "Crural",
    "crural-region": "Crural region",
  },
  ankle: {
    general: "General",
    ankle: "Ankle",
  },
  foot: {
    general: "General",
    sole: "Sole",
    toes: "Toes",
  },
};

function formatSubpartSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function bodyMapChipLabel(selection: BodyMapChipSelection): string {
  const sub = selection.subpart?.trim().toLowerCase() ?? "";
  const side = selection.side;
  if (!sub) return PARENT_CHIP_LABEL[selection.parent] ?? selection.parent;
  /** Detail-map “general” ring = whole L1 region; show Head / Torso, not “General”. */
  if (sub === "general") {
    const base = PARENT_CHIP_LABEL[selection.parent] ?? selection.parent;
    if (side === "left") return `${base} (left)`;
    if (side === "right") return `${base} (right)`;
    return base;
  }
  const mapped = SUBPART_CHIP_LABEL[selection.parent]?.[sub];
  const base = mapped ?? formatSubpartSlug(sub);
  if (side === "left") return `${base} (left)`;
  if (side === "right") return `${base} (right)`;
  return base;
}

export function isBodyMapChipRegion(
  value: string,
): value is BodyMapParentRegion {
  return (BODY_MAP_PARENT_REGIONS as readonly string[]).includes(value);
}

/** @deprecated Use selection-order chips; kept for tests or migrations. */
export const BODY_MAP_CHIP_ORDER: readonly BodyMapParentRegion[] = [
  "whole-body",
  ...BODY_MAP_REGIONS,
];
