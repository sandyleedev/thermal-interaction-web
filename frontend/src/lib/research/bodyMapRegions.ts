/**
 * Canonical body-map region types (three layers).
 *
 * 1. `BodyMapRegion` — merged SVG hit targets on the L1 map (hover / selection).
 *    Excludes `wholeBody` (no silhouette path; whole-body UX uses outline + tint).
 *
 * 2. `BodyMapPlacementRegion` — partition used for dots / density / heatmap marks.
 *    Same set as `BodyMapRegion` today; cohort logic maps finer `BodyMapDetailRegion`
 *    values onto these merged paths.
 *
 * 3. `BodyMapDetailRegion` — finest grain in `bodySites`: L1 parent (`BodyMapParentRegion`) + L2 slug.
 */

/** Main SVG regions (silhouette parts), stable UI / iteration order. Excludes `wholeBody`. */
export const BODY_MAP_REGIONS = [
  "head",
  "neck",
  "torso",
  "arm",
  "wrist",
  "hand",
  "leg",
  "ankle",
  "foot",
] as const;

export type BodyMapRegion = (typeof BODY_MAP_REGIONS)[number];

/** Values allowed in `bodySites.region`, including `wholeBody`. */
export const BODY_MAP_PARENT_REGIONS = [
  "wholeBody",
  ...BODY_MAP_REGIONS,
] as const;

export type BodyMapParentRegion = (typeof BODY_MAP_PARENT_REGIONS)[number];

export type BodyMapPlacementRegion = BodyMapRegion;

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
  wholeBody: ["general"],
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
  ankle: ["general", "ankle"],
  foot: ["general", "sole", "toes"],
} as const satisfies Readonly<Record<BodyMapParentRegion, readonly string[]>>;
