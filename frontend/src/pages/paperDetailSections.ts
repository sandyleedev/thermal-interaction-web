import type { ResearchPaper } from "@/lib/research/researchPapers";

export type PaperDetailFieldKey = keyof ResearchPaper;

export type PaperDetailFieldConfig = {
  label: string;
  key: PaperDetailFieldKey;
  showWhenEmpty: boolean;
};

export type PaperDetailSubsectionConfig = {
  title: string;
  fields: PaperDetailFieldConfig[];
};

export type PaperDetailSectionConfig = {
  title: string;
  fields?: PaperDetailFieldConfig[];
  subsections?: PaperDetailSubsectionConfig[];
};

export const PAPER_DETAIL_SECTIONS: PaperDetailSectionConfig[] = [
  {
    title: "Abstract",
    fields: [{ label: "Abstract", key: "abstract", showWhenEmpty: true }],
  },
  {
    title: "Purpose of applying thermal cues",
    fields: [
      {
        label: "Purpose of applying thermal cues",
        key: "thermalCuePurpose",
        showWhenEmpty: true,
      },
    ],
  },
  {
    title: "Design characteristics",
    subsections: [
      {
        title: "Thermal cues",
        fields: [
          {
            label: "Temperature range",
            key: "temperatureNotes",
            showWhenEmpty: true,
          },
          {
            label: "Ambient temperature in evaluation",
            key: "ambientTempC",
            showWhenEmpty: true,
          },
          {
            label: "Duration of thermal cues",
            key: "durationNotes",
            showWhenEmpty: true,
          },
        ],
      },
      {
        title: "Perception",
        fields: [
          {
            label: "Thermal transfer mode",
            key: "thermalTransferModes",
            showWhenEmpty: true,
          },
          {
            label: "Sensory modalities involved in evaluation",
            key: "senses",
            showWhenEmpty: true,
          },
        ],
      },
      {
        title: "Body",
        fields: [
          { label: "Body location", key: "bodySites", showWhenEmpty: true },
          {
            label: "Material in contact with the skin",
            key: "materialsInContactWithSkin",
            showWhenEmpty: true,
          },
        ],
      },
    ],
  },
  {
    title: "Technical implementation",
    fields: [
      {
        label: "Main Actuator for Temperature Sensation",
        key: "mainActuatorForTemperatureSensation",
        showWhenEmpty: true,
      },
      {
        label: "Main Actuator Model",
        key: "mainActuatorModel",
        showWhenEmpty: true,
      },
      {
        label: "Main Actuator Size",
        key: "mainActuatorSize",
        showWhenEmpty: false,
      },
      {
        label: "Overall Device Size",
        key: "overallDeviceSize",
        showWhenEmpty: false,
      },
      {
        label: "Possible Temperature Range of the Main Actuator",
        key: "mainActuatorPossibleTemperatureRange",
        showWhenEmpty: false,
      },
      {
        label: "Other Sensory Actuators",
        key: "otherSensoryActuators",
        showWhenEmpty: false,
      },
      {
        label: "Auxiliary Hardware",
        key: "auxiliaryHardware",
        showWhenEmpty: false,
      },
      {
        label: "Heat Control Method",
        key: "heatControlMethod",
        showWhenEmpty: true,
      },
      {
        label: "Power consumption",
        key: "powerConsumption",
        showWhenEmpty: true,
      },
      {
        label: "Temporal Parameters",
        key: "temporalParameters",
        showWhenEmpty: false,
      },
      { label: "Other Note", key: "otherNote", showWhenEmpty: false },
    ],
  },
];

export const ARRAY_CHIP_FIELD_KEYS = new Set<PaperDetailFieldKey>([
  "thermalTransferModes",
  "senses",
  "materialsInContactWithSkin",
  "otherSensoryActuators",
]);

export const FREE_TEXT_ARRAY_FIELD_KEYS = new Set<PaperDetailFieldKey>([
  "otherSensoryActuators",
]);

export const PRESERVE_LINE_BREAKS_FIELD_KEYS = new Set<PaperDetailFieldKey>([
  "abstract",
  "thermalCuePurpose",
  "temperatureNotes",
  "durationNotes",
  "temporalParameters",
  "otherNote",
]);
