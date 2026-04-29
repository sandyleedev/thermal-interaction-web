import {
  ALL_RESEARCH_PAPERS,
  type ResearchPaper,
} from "@/lib/research/researchPapers";

/** Rich preview + detail fields for the Results list and `/paper/:id` page. */
export type PaperPreviewRecord = {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  bodyRegion: string;
  transferMode: string;
  temperatureRange: string;
  duration: string;
  tags: string[];
  abstract: string;
  engineeringSummary?: string;
};

type CuratedFields = Omit<PaperPreviewRecord, "id">;

const CURATED_BY_ID: Record<string, CuratedFields> = {
  "p-1": {
    title:
      "Thermal In Motion: Designing Thermal Flow Illusions with Tactile and Thermal Interaction",
    authors:
      "Singhal, Yatharth; Honrales, Daniel; Wang, Haokun; Kim, Jin Ryong",
    year: 2024,
    journal: "ACM Digital Library",
    bodyRegion: "Arm",
    transferMode: "Conduction",
    temperatureRange: "−15°C – 9°C",
    duration: "~2–10 s intervals",
    tags: ["Thermal", "Haptic", "Conduction", "Arm"],
    abstract:
      "Introduces a thermal motion illusion by combining thermal and tactile cues to create dynamic, flowing thermal sensations and improve VR immersion.",
    engineeringSummary:
      "Relative thermal stimuli ranged from −15°C to +9°C from neutral skin temperature. Control relied on stimulus onset asynchrony, warm-up duration, and pre-calibrated voltage mapping to generate perceived continuous motion.",
  },
  "p-2": {
    title:
      "Designing Beyond Hot and Cold – Exploring Full-Body Heat Experiences in Sauna",
    authors: "Moesgen, Tim; Gowrishankar, Ramyah; Xiao, Yu",
    year: 2024,
    journal: "ACM Digital Library",
    bodyRegion: "Whole body",
    transferMode: "Convection",
    temperatureRange: "80°C – 90°C",
    duration: "~10 min sessions",
    tags: ["Thermal", "Whole body", "Convection", "Sauna"],
    abstract:
      "Explores how people perceive, articulate, and describe full-body heat experiences in a traditional sauna using phenomenological and multisensory methods.",
    engineeringSummary:
      "Heat exposure came from sauna steam rather than an artificial device. Two ~10-minute sauna sittings formed the core exposure, with steam application and cool-down intervals shaping the thermal experience.",
  },
  "p-3": {
    title:
      "Enhancing Food Coldness Perception via Synchronous Posterior Neck Cold stimulus during Swallowing",
    authors: "Komiya, Shin'ichi; Nitto, Ryota; Ban, Yuki; Warisawa, Shin'ichi",
    year: 2024,
    journal: "ACM Digital Library",
    bodyRegion: "Torso",
    transferMode: "Conduction",
    temperatureRange: "−13°C – 50°C",
    duration: "~3–34 s trials",
    tags: ["Thermal", "Haptic", "Taste", "Torso", "Conduction"],
    abstract:
      "Presents a method for enhancing perceived coldness of food by delivering synchronised external cold stimulation to the posterior neck during swallowing.",
    engineeringSummary:
      "The device used feedback-controlled Peltier cooling with a heat sink and fan. Key parameters included ~1°C/s cooling, timing aligned with swallowing or mastication, and a temperature drop of about 2.5–3.0°C below baseline in the constant condition.",
  },
  "p-4": {
    title: "Thermal Masking: When the Illusion Takes Over the Real",
    authors: "Wang, Haokun; Singhal, Yatharth; Gil, Hyunjae; Kim, Jin Ryong",
    year: 2024,
    journal: "ACM Digital Library",
    bodyRegion: "Arm",
    transferMode: "Conduction",
    temperatureRange: "−8°C – −6°C",
    duration: "5–7 s blocks",
    tags: ["Thermal", "Haptic", "Conduction", "Arm"],
    abstract:
      "Investigates thermal masking, a perceptual illusion in which vibrotactile stimulation can cause illusory thermal sensations to override or relocate the original thermal source.",
    engineeringSummary:
      "Relative thermal stimuli ranged from −8°C to +6°C. The setup combined curved Peltier modules with vibrotactile actuators, with key engineering variables including response time, stimulus duration, vibration frequency/force, and actuator distance.",
  },
  "p-5": {
    title:
      "Hydroptical Thermal Feedback: Spatial Thermal Feedback Using Visible Lights and Water",
    authors: "Ichihashi, Sosuke; Inami, Masahiko; Ho, Hsin-Ni; Howell, Noura",
    year: 2024,
    journal: "ACM Digital Library",
    bodyRegion: "Hand (palm)",
    transferMode: "Conduction, Radiation",
    temperatureRange: "25°C – 38°C",
    duration: "1–20 s trials",
    tags: ["Thermal", "Vision", "Hand", "Radiation"],
    abstract:
      "Introduces hydroptical thermal feedback, a method that uses visible light and water to create spatial thermal sensations, including apparent motion and illusory water temperature changes.",
    engineeringSummary:
      "Thermal feedback was generated through 100W LEDs shining through water onto skin, with illuminance, wavelength, distance, and SOA as key control variables. Baseline water temperature remained around 25–26°C while perceived temperature changed with light intensity.",
  },
};

function formatSecondsBrief(s: number): string {
  if (s >= 3600) return `${Math.round((s / 3600) * 10) / 10} h`;
  if (s >= 60) return `${Math.round(s / 60)} min`;
  return `${Math.round(s)} s`;
}

function formatDurationRange(minS: number, maxS: number): string {
  if (Math.abs(minS - maxS) < 0.5) return `~${formatSecondsBrief(minS)}`;
  return `${formatSecondsBrief(minS)} – ${formatSecondsBrief(maxS)}`;
}

function bodyRegionLabel(region: ResearchPaper["bodyRegion"]): string {
  const map: Record<string, string> = {
    head: "Head",
    neck: "Neck",
    torso: "Torso",
    arms: "Arms",
    legs: "Legs",
    hands: "Hands",
    feet: "Feet",
  };
  return map[region] ?? region;
}

function titleCaseOption(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function syntheticPreview(p: ResearchPaper): PaperPreviewRecord {
  const tagCandidates = [
    ...p.senses.slice(0, 2).map(titleCaseOption),
    bodyRegionLabel(p.bodyRegion),
    ...(p.thermalModes.length ? [titleCaseOption(p.thermalModes[0])] : []),
  ];
  const tags = [...new Set(tagCandidates)].slice(0, 5);
  return {
    id: p.id,
    title: `Thermal interaction study (${p.id})`,
    authors: "Various authors",
    year: 2024,
    journal: "ACM Digital Library",
    bodyRegion: bodyRegionLabel(p.bodyRegion),
    transferMode: p.thermalModes[0] ?? "—",
    temperatureRange: `${Math.round(p.minC)}°C – ${Math.round(p.maxC)}°C`,
    duration: formatDurationRange(p.durationMinS, p.durationMaxS),
    tags,
    abstract:
      "Placeholder abstract for this catalogue entry. Replace with structured metadata when linking to an external bibliography.",
  };
}

/** Merge curated copy with generated papers for list + detail views. */
export function resolvePaperPreview(p: ResearchPaper): PaperPreviewRecord {
  const curated = CURATED_BY_ID[p.id];
  if (curated) return { ...curated, id: p.id };
  return syntheticPreview(p);
}

export function getPaperPreviewById(id: string): PaperPreviewRecord | undefined {
  const curated = CURATED_BY_ID[id];
  if (curated) return { ...curated, id };
  const rp = ALL_RESEARCH_PAPERS.find((x) => x.id === id);
  return rp ? syntheticPreview(rp) : undefined;
}
