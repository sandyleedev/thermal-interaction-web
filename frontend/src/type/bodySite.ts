import type { BodySiteSide } from "@/type/bodySiteSide";

/**
 * One measured / stimulated location on the body.
 * - `region` should be an L1 parent (`head`, `arm`, …) or `whole-body`.
 * - `subregion` is the L2 slug (`forearm`, `palm`, …); use `general` when unknown.
 * - `side` is `left`, `right`, or `null` when laterality is unknown.
 */
export type BodySite = {
  region: string;
  subregion: string;
  side?: BodySiteSide;
};
