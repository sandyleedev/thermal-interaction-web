import {
  ALL_RESEARCH_PAPERS,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

/** Rich preview + detail fields for the Results list and `/paper/:id` page. */
export type PaperPreviewRecord = {
  id: string;
  title: string;
  authors: string;
  publicationYear: number;
  publicationVenue: string;
  mainBodyPart: string;
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

function mainBodyPartLabel(region: ResearchPaper["mainBodyPart"]): string {
  const map: Record<string, string> = {
    head: "Head",
    neck: "Neck",
    torso: "Torso",
    arm: "Arm",
    wrist: "Wrist",
    hand: "Hand",
    leg: "Leg",
    ankle: "Ankle",
  };
  return map[region] ?? region;
}

function titleCaseOption(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function previewFromResearchPaper(p: ResearchPaper): PaperPreviewRecord {
  const tagCandidates = [
    ...p.senses.map(titleCaseOption),
    ...p.materials.map(titleCaseOption),
    mainBodyPartLabel(p.mainBodyPart),
    ...p.thermalModes.map(titleCaseOption),
  ];
  const keywords = [...new Set(tagCandidates.map((k) => k.trim()).filter(Boolean))];
  return {
    id: p.id,
    title: p.title?.trim() || `Thermal interaction study (${p.id})`,
    authors: p.authors?.trim() || "Unknown author",
    publicationYear: p.publicationYear ?? 2024,
    publicationVenue: p.publicationVenue?.trim() || "Unknown venue",
    mainBodyPart: mainBodyPartLabel(p.mainBodyPart),
    transferMode: p.thermalModes.length ? p.thermalModes.join(", ") : "—",
    temperatureRange: `${Math.round(p.minC)}°C – ${Math.round(p.maxC)}°C`,
    duration: formatDurationRange(p.durationMinS, p.durationMaxS),
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
