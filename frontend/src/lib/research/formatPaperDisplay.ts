/**
 * Format research paper data for display in the UI.
 */

import { paperHasReportedDurationRange } from "@/lib/research/filterResearchPapers";
import { publicAssetUrl } from "@/lib/publicAssetUrl";
import type { BodySite } from "@/type/bodySite";
import type { ResearchPaper } from "@/type/researchPaper";
import { ALL_RESEARCH_PAPERS, normalizeBodySites } from "@/lib/research/researchPapers";

/**
 * Display fields used by paper cards in the result panel.
 * e.g. { title: "Thermal In Motion", temperatureRange: "24°C – 40°C", keywords: ["Conduction", …] }
 */
export type PaperDisplay = {
  id: string;
  title: string;
  authors: string;
  publicationYear?: number;
  publicationVenue?: string;
  transferMode: string;
  temperatureRange: string;
  duration: string;
  keywords: string[];
  thumbnailUrls: string[];
};

/**
 * Build possible thumbnail paths for a paper DOI.
 * e.g. "10.1145/3654777.3676460" → ["/paper-thumbnails/10.1145_3654777.3676460.jpg", …]
 */
function thumbnailUrlsForDoi(doi?: string): string[] {
  if (!doi) return [];
  const key = doi.replace(/\//g, "_");
  const base = publicAssetUrl(`paper-thumbnails/${key}`);
  return [`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`];
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;

/**
 * Format seconds as a short duration label.
 * e.g. 120 → "2 min"; 90000 → "1 day"; 604800 → "1 week"
 */
function formatSecondsBrief(s: number): string {
  if (s >= SECONDS_PER_WEEK) {
    const weeks = Math.round((s / SECONDS_PER_WEEK) * 10) / 10;
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (s >= SECONDS_PER_DAY) {
    const days = Math.round((s / SECONDS_PER_DAY) * 10) / 10;
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (s >= SECONDS_PER_HOUR) {
    return `${Math.round((s / SECONDS_PER_HOUR) * 10) / 10} h`;
  }
  if (s >= SECONDS_PER_MINUTE) {
    return `${Math.round(s / SECONDS_PER_MINUTE)} min`;
  }
  return `${Math.round(s)} s`;
}

/**
 * Format a duration range for display.
 * e.g. (2, 10) → "2 s – 10 s"; (5, 5) → "~5 s"
 */
function formatDurationRange(minS: number, maxS: number): string {
  if (Math.abs(minS - maxS) < 0.5) return `~${formatSecondsBrief(minS)}`;
  return `${formatSecondsBrief(minS)} – ${formatSecondsBrief(maxS)}`;
}

/**
 * Format the reported temperature range.
 * e.g. minTempC 24, maxTempC 40 → "24°C – 40°C"; missing bounds → "N/A"
 */
function formatTemperatureRangeDisplay(p: ResearchPaper): string {
  if (p.minTempC != null && p.maxTempC != null) {
    return `${Math.round(p.minTempC)}°C – ${Math.round(p.maxTempC)}°C`;
  }
  return "N/A";
}

/**
 * Format the reported duration range.
 * e.g. minDurationSec 2, maxDurationSec 10 → "2 s – 10 s"; no range → "N/A"
 */
function formatDurationRangeDisplay(p: ResearchPaper): string {
  if (paperHasReportedDurationRange(p)) {
    return formatDurationRange(
      p.minDurationSec as number,
      p.maxDurationSec as number,
    );
  }
  return "N/A";
}

/**
 * Convert body-map region keys into readable labels.
 * e.g. "arm" → "Arm", "whole-body" → "Whole body"
 */
function taxonomyRegionLabel(region: string): string {
  const map: Record<string, string> = {
    head: "Head",
    neck: "Neck",
    torso: "Torso",
    arm: "Arm",
    wrist: "Wrist",
    hand: "Hand",
    leg: "Leg",
    ankle: "Ankle",
    "whole-body": "Whole body",
    foot: "Foot",
  };
  return map[region] ?? titleCaseOption(region);
}

/**
 * Format one body site as a readable label.
 * e.g. { region: "arm", subregion: "forearm", side: null } → "Arm - Forearm"
 */
export function formatBodySiteLine(site: BodySite): string {
  const reg = taxonomyRegionLabel(site.region);
  const sub =
    site.subregion === "general"
      ? "General"
      : titleCaseOption(site.subregion.replace(/-/g, " "));
  let line = `${reg} - ${sub}`;
  if (site.side === "left" || site.side === "right") {
    line += ` (${site.side === "left" ? "Left" : "Right"})`;
  }
  return line;
}

/**
 * Convert a slug into a title-case label.
 * e.g. "haptic-tactile" → "Haptic Tactile"
 */
export function titleCaseOption(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}

/**
 * Build all UI display fields for one paper.
 * e.g. ResearchPaper → PaperDisplay with title, keywords, temperatureRange, …
 */
function buildPaperDisplay(p: ResearchPaper): PaperDisplay {
  const bodySiteKeywords = normalizeBodySites(p).map(formatBodySiteLine);
  const tagCandidates = [
    ...p.senses.map(titleCaseOption),
    ...p.materialsInContactWithSkin.map(titleCaseOption),
    ...bodySiteKeywords,
    ...p.thermalTransferModes.map(titleCaseOption),
  ];
  const keywords = [
    ...new Set(tagCandidates.map((k) => k.trim()).filter(Boolean)),
  ];
  return {
    id: p.id,
    title: p.title.trim(),
    authors: p.authors?.trim() || "Unknown author",
    ...(p.publicationYear != null && Number.isFinite(p.publicationYear)
      ? { publicationYear: p.publicationYear }
      : {}),
    ...(p.publicationVenue?.trim()
      ? { publicationVenue: p.publicationVenue.trim() }
      : {}),
    transferMode: p.thermalTransferModes.length
      ? p.thermalTransferModes.join(", ")
      : "—",
    temperatureRange: formatTemperatureRangeDisplay(p),
    duration: formatDurationRangeDisplay(p),
    keywords,
    thumbnailUrls: thumbnailUrlsForDoi(p.doi),
  };
}

/**
 * Convert one research paper into its UI display format.
 * e.g. formatPaperDisplay(paper) → card/detail fields for ResultsPanel and PaperDetailPage
 */
export function formatPaperDisplay(p: ResearchPaper): PaperDisplay {
  return buildPaperDisplay(p);
}

/**
 * Find a paper by id and return its UI display format.
 * e.g. getPaperDisplayById("1") → PaperDisplay; unknown id → undefined
 */
export function getPaperDisplayById(id: string): PaperDisplay | undefined {
  const rp = ALL_RESEARCH_PAPERS.find((x) => x.id === id);
  return rp ? buildPaperDisplay(rp) : undefined;
}
