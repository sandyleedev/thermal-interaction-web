/**
 * Canonical body-map region types (three layers).
 *
 * 1. `BodyMapRegion` — merged SVG hit targets on the L1 map (hover / selection).
 *    Excludes `wholeBody` (no silhouette path; whole-body UX uses outline + tint).
 *
 * 2. `BodyMapPlacementRegion` — partition used for dots / density / heatmap marks.
 *    Today identical to `BodyMapRegion`; cohort logic maps finer `BodyMapDetailRegion`
 *    slugs onto these merged paths.
 *
 * 3. `BodyMapDetailRegion` — finest grain stored in `bodySites` (L1 parent + L2 slug).
 *    `BodyMapDetailParentId` is the L1 column id, including `wholeBody`.
 */

/** L1 taxonomy id stored in `bodySites.region` (includes `wholeBody`). */
export type BodyMapDetailParentId =
  | "wholeBody"
  | "head"
  | "neck"
  | "torso"
  | "arm"
  | "wrist"
  | "hand"
  | "leg"
  | "ankle"
  | "foot";

/**
 * One anatomical site from the dataset after normalisation (`resolveBodySite`):
 * L1 parent + L2 kebab slug.
 */
export type BodyMapDetailRegion = {
  parent: BodyMapDetailParentId;
  /** L2 slug; use `"general"` when nothing finer is known. */
  subregion: string;
};

/**
 * Merged silhouette path id on the full-body SVG (`body-silhouette-parts.svg`).
 * Used for pointer hit targets and coarse selection on the map.
 */
export type BodyMapRegion = Exclude<BodyMapDetailParentId, "wholeBody">;

/**
 * Region bucket used when placing heatmap / raw-dot samples on the L1 map.
 * Same id set as {@link BodyMapRegion} today; finer {@link BodyMapDetailRegion} rows
 * are folded onto these paths via label cohorts (`bodyMapDotCohorts.ts`).
 */
export type BodyMapPlacementRegion = BodyMapRegion;

/** Physical L1 parents only, in stable UI / count order (excludes `wholeBody`). */
export const BODY_MAP_PHYSICAL_L1_IDS: readonly BodyMapDetailParentId[] = [
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

/** Same order as merged paths in the silhouette asset (SVG hit + placement). */
export const BODY_MAP_REGION_IDS: readonly BodyMapRegion[] = [
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

/** @deprecated Prefer {@link BODY_MAP_PHYSICAL_L1_IDS}. */
export const BODY_MAP_COARSE_REGION_IDS = BODY_MAP_PHYSICAL_L1_IDS;

/**
 * Allowed `subregion` values per L1 parent. Empty array would mean “general” only.
 * Extend when new L2 art or data columns appear.
 */
export const BODY_MAP_L2_SUBREGIONS_BY_PARENT: Readonly<
  Record<BodyMapDetailParentId, readonly string[]>
> = {
  wholeBody: ["general"],
  head: [
    "general",
    "ear",
    "forehead",
    "nose",
    "cheek",
    "lip",
    "tongue",
  ],
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
};
