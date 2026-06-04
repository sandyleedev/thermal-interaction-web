import { useEffect, useState } from "react";
import type { BodyMapVariant } from "@/components/body-map/bodyMapVariant";

/** Matches landing desktop 3-column layout; mobile/tablet never show hover copy. */
const DESKTOP_LAYOUT_MQ = "(min-width: 1024px)";
const MOBILE_REGION_LIST_MQ = "(max-width: 767px)";

function useMediaQuery(query: string, defaultMatches = false): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(query).matches
      : defaultMatches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

/** PC (≥1024px) vs mobile/tablet help copy. */
export function useBodyMapHelpContext() {
  const prefersHover = useMediaQuery(DESKTOP_LAYOUT_MQ, false);
  const showMobileRegionList = useMediaQuery(MOBILE_REGION_LIST_MQ, false);
  return { prefersHover, showMobileRegionList };
}

function formatCountRange(domain: readonly [number, number]): string {
  return `${domain[0].toLocaleString()} to ${domain[1].toLocaleString()}`;
}

/** Area view (rawDots): legend scale + pink opacity both reflect filtered paper count. */
const AREA_VIEW_CLUSTER_EXPLANATION =
  "Darker colour means more papers in that area.";

const AREA_VIEW_DETAIL_CLUSTER_EXPLANATION =
  "Darker colour means more papers here.";

const AREA_VIEW_LEGEND_INTERACT_HOVER =
  "Hover regions or the outline for counts. Click a region for its detail map; outline for whole-body (general).";

const AREA_VIEW_LEGEND_INTERACT_TAP =
  "Tap a region for its detail map; outline for whole-body (general).";

const AREA_VIEW_LEGEND_INTERACT_TAP_MOBILE =
  "Tap a region on the map or the buttons below for detail; outline for whole-body (general).";

export function fullBodyMapAriaLabel(
  variant: BodyMapVariant,
  prefersHover: boolean,
): string {
  if (prefersHover) {
    return variant === "countHeatmap"
      ? "Body map: smooth density heatmap for filtered papers on a fixed full-dataset scale; whole-body general studies use a full-silhouette tint. Hover regions or the outer outline for counts. Click a region to open its detail map and select subregions; click the outline for whole-body (general)."
      : `Body map: area view. ${AREA_VIEW_CLUSTER_EXPLANATION} ${AREA_VIEW_LEGEND_INTERACT_HOVER}`;
  }
  return variant === "countHeatmap"
    ? "Body map: smooth density heatmap for filtered papers. Tap regions on the map, or the region buttons below on small screens, to open detail maps and select subregions; tap the outer outline for whole-body (general)."
    : `Body map: area view. ${AREA_VIEW_CLUSTER_EXPLANATION} ${AREA_VIEW_LEGEND_INTERACT_TAP}`;
}

export function fullBodyMapLegendCaption(
  variant: BodyMapVariant,
  colorDomain: readonly [number, number],
  ctx: { prefersHover: boolean; showMobileRegionList: boolean },
): string {
  const range = formatCountRange(colorDomain);
  const scale =
    variant === "countHeatmap"
      ? `Paper density (low to high): ${range} papers.`
      : `Paper count (low to high): ${range}. ${AREA_VIEW_CLUSTER_EXPLANATION}`;

  if (variant === "rawDots") {
    if (ctx.prefersHover) {
      return `${scale} ${AREA_VIEW_LEGEND_INTERACT_HOVER}`;
    }
    if (ctx.showMobileRegionList) {
      return `${scale} ${AREA_VIEW_LEGEND_INTERACT_TAP_MOBILE}`;
    }
    return `${scale} ${AREA_VIEW_LEGEND_INTERACT_TAP}`;
  }

  if (ctx.prefersHover) {
    return `${scale} Hover regions or the outer outline for counts. Click a region to open its detail map and select subregions; click the outline for whole-body (general).`;
  }

  if (ctx.showMobileRegionList) {
    return `${scale} Tap a region on the map or use the buttons below to open detail maps and select subregions; tap the outline for whole-body (general).`;
  }

  return `${scale} Tap regions on the map to open detail maps and select subregions; tap the outer outline for whole-body (general).`;
}

type DetailLegendCaptionOptions = {
  variant: BodyMapVariant;
  colorDomain: readonly [number, number];
  prefersHover: boolean;
  /** e.g. "whole-head (general)" */
  generalScope: string;
  /** Heatmap-only targets before the general scope phrase. */
  heatmapTargets?: string;
  /** Optional note before interaction (e.g. hand row layout). */
  leadingNote?: string;
  /** Trailing note (e.g. unspecified side split). */
  trailingNote?: string;
  /** Overrides default area-view interaction line (after the intensity sentence). */
  areaViewInteract?: string;
};

export function bodyMapDetailLegendCaption({
  variant,
  colorDomain,
  prefersHover,
  generalScope,
  heatmapTargets = "subregions or the outline",
  leadingNote,
  trailingNote,
  areaViewInteract,
}: DetailLegendCaptionOptions): string {
  const range = `Paper count (low to high): ${formatCountRange(colorDomain)}.`;
  const prefix = leadingNote ? `${leadingNote} ` : "";
  const suffix = trailingNote ? ` ${trailingNote}` : "";

  if (variant === "countHeatmap") {
    const interact = prefersHover
      ? `Hover ${heatmapTargets} for ${generalScope}.`
      : `Tap ${heatmapTargets} to select ${generalScope}.`;
    return `${range} ${prefix}${interact}${suffix}`.replace(/\s+/g, " ").trim();
  }

  const interact =
    areaViewInteract ??
    (prefersHover
      ? `Hover the outline for ${generalScope}.`
      : `Tap the outline to select ${generalScope}.`);
  return `${range} ${AREA_VIEW_DETAIL_CLUSTER_EXPLANATION} ${prefix}${interact}${suffix}`
    .replace(/\s+/g, " ")
    .trim();
}
