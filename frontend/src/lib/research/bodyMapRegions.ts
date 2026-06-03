/**
 * Canonical body-map region types (three layers).
 *
 * 1. `BodyMapRegion` — merged SVG hit targets on the L1 map (hover / selection).
 *    Excludes `whole-body` (no silhouette path; whole-body UX uses outline + tint).
 *
 * 2. `BodyMapPlacementRegion` — partition for dots / density / heatmap marks on the L1 SVG.
 *    Finer than merged hit targets where needed (torso, arm, leg); each placement maps to
 *    exactly one {@link BodyMapRegion} path via {@link bodyMapRegionForPlacement}.
 *
 * 3. `BodyMapDetailRegion` — finest grain in `bodySites`: L1 parent (`BodyMapParentRegion`) + L2 slug.
 */

/** Main SVG regions (silhouette parts), stable UI / iteration order. Excludes `whole-body`. */
export const BODY_MAP_REGIONS = [
  "head",
  "neck",
  "torso",
  "arm",
  "wrist",
  "hand",
  "leg",
  "gluteal",
  "ankle",
  "foot",
] as const;

export type BodyMapRegion = (typeof BODY_MAP_REGIONS)[number];

/** Values allowed in `bodySites.region`, including `whole-body`. */
export const BODY_MAP_PARENT_REGIONS = [
  "whole-body",
  ...BODY_MAP_REGIONS,
] as const;

export type BodyMapParentRegion = (typeof BODY_MAP_PARENT_REGIONS)[number];

/**
 * Dot / density placement keys on the L1 map. Torso, arm, and leg use L2-style slices; other
 * parents use the same string as the merged SVG {@link BodyMapRegion} id.
 */
export const BODY_MAP_PLACEMENT_REGIONS = [
  "head",
  "neck",
  "torso-general",
  "torso-shoulder",
  "torso-chest",
  "torso-abdomen",
  "arm-general",
  "arm-upper-arm",
  "arm-forearm",
  "wrist",
  "hand",
  "leg-general",
  "leg-thigh",
  "leg-crural",
  "gluteal",
  "ankle",
  "foot",
] as const;

export type BodyMapPlacementRegion = (typeof BODY_MAP_PLACEMENT_REGIONS)[number];

const PLACEMENT_TO_BODY_MAP_REGION = {
  head: "head",
  neck: "neck",
  "torso-general": "torso",
  "torso-shoulder": "torso",
  "torso-chest": "torso",
  "torso-abdomen": "torso",
  "arm-general": "arm",
  "arm-upper-arm": "arm",
  "arm-forearm": "arm",
  wrist: "wrist",
  hand: "hand",
  "leg-general": "leg",
  "leg-thigh": "leg",
  "leg-crural": "leg",
  gluteal: "gluteal",
  ankle: "ankle",
  foot: "foot",
} as const satisfies Record<BodyMapPlacementRegion, BodyMapRegion>;

export function bodyMapRegionForPlacement(
  placement: BodyMapPlacementRegion,
): BodyMapRegion {
  return PLACEMENT_TO_BODY_MAP_REGION[placement];
}

/**
 * One anatomical site from the dataset after normalisation (`resolveBodySite`):
 * L1 parent + L2 kebab slug.
 */
export type BodyMapDetailRegion = {
  parent: BodyMapParentRegion;
  /** L2 slug; use `"general"` when nothing finer is known. */
  subregion: string;
};

/**
 * Allowed `subregion` values per L1 parent. Empty array would mean “general” only.
 * Extend when new L2 art or data columns appear.
 */
export const BODY_MAP_L2_SUBREGIONS_BY_PARENT = {
  "whole-body": ["general"],
  head: ["general", "ear", "forehead", "nose", "cheek", "lip", "tongue"],
  neck: ["general", "posterior", "anterior"],
  torso: ["general", "shoulder", "chest", "abdomen", "back"],
  arm: ["general", "upper-arm", "forearm"],
  wrist: ["general", "ventral", "dorsal"],
  hand: [
    "general",
    "palm",
    "fingertips",
    "fingers",
    "thenar-eminence",
    "hand-back",
  ],
  leg: ["general", "thigh", "crural", "crural-region"],
  gluteal: ["general"],
  ankle: ["general", "ankle"],
  foot: ["general", "sole", "toes"],
} as const satisfies Readonly<Record<BodyMapParentRegion, readonly string[]>>;
