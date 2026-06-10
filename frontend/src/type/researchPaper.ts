import type { BodySite } from "@/type/bodySite";

export type ResearchPaper = {
  id: string; // Stable paper id; e.g. "1"
  title: string; // Paper title
  authors?: string; // Author list; e.g. "Singhal, Yatharth; Honrales, Daniel"
  publicationYear?: number; // Publication year; e.g. 2024
  publicationSortDate?: string; // ISO date for sorting; e.g. "2024-10-11"
  publicationVenue?: string; // Venue or conference; e.g. "UIST"
  doi?: string; // DOI identifier; e.g. "10.1145/3654777.3676460"
  url?: string; // Paper link; e.g. "https://doi.org/10.1145/3654777.3676460"
  abstract?: string | null;
  temperatureNotes?: string | null; //temperature description

  ambientTempC?: number | null; // Ambient room temperature in °C; e.g. 24
  minTempC: number | null; // Lower bound of reported stimulus range in °C; e.g. -15
  maxTempC: number | null; // Upper bound of reported stimulus range in °C; e.g. 40
  durationNotes?: string | null; // duration description
  minDurationSec: number | null; // Shortest reported stimulus duration in seconds; e.g. 1.9
  maxDurationSec: number | null; // Longest reported stimulus duration in seconds; e.g. 10
  senses: string[]; // Sensory modalities used; e.g. ["haptic-tactile", "visual"]
  thermalPerceptionMeasure?: string | null; // How thermal perception was measured
  thermalCuePurpose?: string | null; // Why thermal cues were applied
  thermalTransferModes: string[]; // Heat transfer mechanism slugs; e.g. ["conduction"]

  mainActuatorForTemperatureSensation?: string | null; // Primary thermal actuator type; e.g. "Peltier"
  mainActuatorModel?: string | null; // Actuator model name; e.g. "Tegway S043A030040"
  mainActuatorSize?: string | null; // Actuator dimensions; e.g. "30×40×2.3 mm"
  overallDeviceSize?: string | null; // Whole-device dimensions; e.g. "65×35×15 mm"
  mainActuatorPossibleTemperatureRange?: string | null; // Actuator temperature capability; e.g. "Max temperature difference: 64°C"
  otherSensoryActuators?: string[]; // Non-thermal actuators; e.g. ["ERM vibrotactile"]
  auxiliaryHardware?: string[]; // Supporting hardware; e.g. ["Heat sink"]
  heatControlMethod?: string | null; // Temperature control approach; e.g. "Open-loop"
  powerConsumption?: string | null; // Power draw; e.g. "5.7V, 6A"
  temporalParameters?: string | null; // Timing/ramp parameters; e.g. "Warm up: 1s; Cooldown: 20s"
  otherNote?: string | null; // Additional technical notes not covered elsewhere

  materialsInContactWithSkinNotes?: string | null; // Free-text notes on skin-contact materials
  materialsInContactWithSkin: string[]; // Material slugs for filtering; e.g. ["fabrics-textiles", "air-gas"]

  bodyPartsInvolved?: string | null; // Narrative body-part description from the paper
  bodySites: BodySite[]; // Structured body locations; e.g. [{ region: "arm", subregion: "forearm", side: null }]

  powerEnergyConsumption?: string | null; // Energy consumption summary; e.g. "400mAh battery, 5.7 h runtime"
};
