const CSV_COLUMNS = {
  publicationYear: "Publication Year",
  publicationSortDate: "Publication Sort Date",
  publicationVenue: "Venue",
  authors: "Author",
  title: "Title",
  doi: "DOI",
  url: "Url",
  image: "Img",
  abstract: "Abstract",

  ambientTempC: "Ambient temperature",
  temperatureNotes: [
    "Temperature selection/control - °C\n\nAnd ambient temperature",
    "Temperature selection/control - °C",
    "Temperature selection/control",
  ],
  minTempC: "Temp min",
  maxTempC: "Temp max",

  durationNotes: "Duration",
  minDurationSec: ["Duration min (sec)", "Duration min", "DurationMin"],
  maxDurationSec: ["Duration max (sec)", "Duration max", "DurationMax"],

  senses: "Multisensory perception (simplify)",
  thermalPerceptionMeasure: "Measure thermal perception",
  thermalCuePurpose:
    "Applying  thermal cues for what purpose/ What they do with thermal?",

  thermalTransferModes: [
    "Thermal transfer modes - HK Cleaned",
    "Thermal transfer modes - HK",
    "Thermal transfer modes",
  ],

  mainActuatorForTemperatureSensation:
    "Main Actuator for Temperature Sensation - HK Cleaned",
  mainActuatorModel: "Main Actuator Model - HK Cleaned",
  mainActuatorSize: "Main Actuator Size - HK Cleaned",
  overallDeviceSize: "Overall Device Size - HK Cleaned",
  mainActuatorPossibleTemperatureRange:
    "Possible Temperature Range of the Main Actuator",
  otherSensoryActuators: "Other Sensory Actuators - HK Cleaned",
  auxiliaryHardware: "Auxiliary Hardware - HK Cleaned",
  heatControlMethod: "Heat Control Method - HK Cleaned",
  powerConsumption: "Power consumption - HK Cleaned",
  temporalParameters: "Temporal Parameters - HK Cleaned",
  otherNote: "Other Note - HK Cleaned",

  bodyPartsInvolved:
    "Body parts involved - which side (dorsal, ventral) and which skin (glabrous, hairy)",
  bodySites: "Body parts (Main > Sub)",

  powerEnergyConsumption: "Power/Energy Consumption",
  materialsInContactWithSkinNotes: "Material(s) in contact with skin",
  materialsInContactWithSkin: "Material(s) in contact with skin - for filter",
};

const ARRAY_FIELDS = new Set([
  "senses",
  "thermalTransferModes",
  "otherSensoryActuators",
  "auxiliaryHardware",
  "materialsInContactWithSkin",
]);

const NUMBER_FIELDS = new Set([
  "publicationYear",
  "ambientTempC",
  "minTempC",
  "maxTempC",
  "minDurationSec",
  "maxDurationSec",
]);

module.exports = {
  CSV_COLUMNS,
  ARRAY_FIELDS,
  NUMBER_FIELDS,
};
