import { paperHasReportedDurationRange } from "@/lib/research/filterResearchPapers";
import {
  ALL_RESEARCH_PAPERS,
  normalizeBodySites,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

/** Rich preview + detail fields for the Results list and `/paper/:id` page. */
export type PaperPreviewRecord = {
  id: string;
  title: string;
  authors: string;
  publicationYear: number;
  publicationVenue: string;
  bodySitesSummary: string;
  transferMode: string;
  temperatureRange: string;
  duration: string;
  keywords: string[];
  abstract: string;
  engineeringSummary?: string;
  thumbnailUrls: string[];
};

function thumbnailUrlsForDoi(doi?: string): string[] {
  if (!doi) return [];
  const key = doi.replace(/\//g, "_");
  const base = `/paper-thumbnails/${key}`;
  return [`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`];
}

function formatSecondsBrief(s: number): string {
  if (s >= 3600) return `${Math.round((s / 3600) * 10) / 10} h`;
  if (s >= 60) return `${Math.round(s / 60)} min`;
  return `${Math.round(s)} s`;
}

function formatDurationRange(minS: number, maxS: number): string {
  if (Math.abs(minS - maxS) < 0.5) return `~${formatSecondsBrief(minS)}`;
  return `${formatSecondsBrief(minS)} – ${formatSecondsBrief(maxS)}`;
}

function formatTemperatureRangeDisplay(p: ResearchPaper): string {
  if (p.minTempC != null && p.maxTempC != null) {
    return `${Math.round(p.minTempC)}°C – ${Math.round(p.maxTempC)}°C`;
  }
  return "N/A";
}

function formatDurationRangeDisplay(p: ResearchPaper): string {
  if (paperHasReportedDurationRange(p)) {
    return formatDurationRange(p.minDurationSec as number, p.maxDurationSec as number);
  }
  return "N/A";
}

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
    wholeBody: "Whole body",
    foot: "Foot",
  };
  return map[region] ?? titleCaseOption(region);
}

function formatBodySitesDisplay(p: ResearchPaper): string {
  const sites = normalizeBodySites(p);
  if (sites.length === 0) return "—";
  return sites
    .map((s) => {
      const reg = taxonomyRegionLabel(s.region);
      const sub =
        s.subregion === "general"
          ? "General"
          : titleCaseOption(s.subregion.replace(/-/g, " "));
      let line = `${reg} — ${sub}`;
      if (s.side === "left" || s.side === "right") {
        line += ` (${s.side === "left" ? "Left" : "Right"})`;
      }
      return line;
    })
    .join("; ");
}

export function titleCaseOption(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function previewFromResearchPaper(p: ResearchPaper): PaperPreviewRecord {
  const tagCandidates = [
    ...p.senses.map(titleCaseOption),
    ...p.materials.map(titleCaseOption),
    formatBodySitesDisplay(p),
    ...p.thermalTransferModes.map(titleCaseOption),
  ];
  const keywords = [...new Set(tagCandidates.map((k) => k.trim()).filter(Boolean))];
  return {
    id: p.id,
    title: p.title?.trim() || `Thermal interaction study (${p.id})`,
    authors: p.authors?.trim() || "Unknown author",
    publicationYear: p.publicationYear ?? 2024,
    publicationVenue: p.publicationVenue?.trim() || "Unknown venue",
    bodySitesSummary: formatBodySitesDisplay(p),
    transferMode: p.thermalTransferModes.length
      ? p.thermalTransferModes.join(", ")
      : "—",
    temperatureRange: formatTemperatureRangeDisplay(p),
    duration: formatDurationRangeDisplay(p),
    keywords,
    thumbnailUrls: thumbnailUrlsForDoi(p.doi),
    abstract:
      p.technicalSummary?.trim() ||
      "No summary has been provided for this paper yet.",
  };
}

export function resolvePaperPreview(p: ResearchPaper): PaperPreviewRecord {
  return previewFromResearchPaper(p);
}

export function getPaperPreviewById(
  id: string,
): PaperPreviewRecord | undefined {
  const rp = ALL_RESEARCH_PAPERS.find((x) => x.id === id);
  return rp ? previewFromResearchPaper(rp) : undefined;
}
