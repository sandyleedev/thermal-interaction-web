// scripts/research-paper-converter/sense_mapping.js

const SENSE_IDS = {
  THERMAL_ALONE: "thermal-alone",
  HAPTIC_TACTILE: "haptic-tactile",
  HAPTIC_FORCE: "haptic-force",
  KINESTHETIC_MOTION: "kinesthetic-motion",
  VISUAL: "visual",
  AUDITORY: "auditory",
  OLFACTORY: "olfactory",
  TRIGEMINAL_NERVE: "trigeminal-nerve",
  GUSTATORY: "gustatory",
  BODY_GENERAL: "body-general",
};

const normaliseSenseValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\s*\/\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const splitSenseValues = (value) =>
  String(value ?? "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const isEmptySenseValue = (value) => {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();

  return (
    text === "" ||
    text === "n/a" ||
    text === "na" ||
    text === "null" ||
    text === "no" ||
    text === "no."
  );
};

const mapSenseValue = (rawValue) => {
  const value = normaliseSenseValue(rawValue);

  if (!value) return null;

  // thermal-only rule is handled later.
  if (
    value === "thermal" ||
    value === "thermal alone" ||
    value === "thermal-alone"
  ) {
    return "thermal";
  }

  // If a comma-separated item contains tactile, map it to haptic-tactile.
  // Examples:
  // Tactile
  // haptic-tactile
  // Tactile (vib)
  // Tactile (texture)
  // Haptic tactile
  if (value.includes("tactile") || value.includes("haptic-tactile")) {
    return SENSE_IDS.HAPTIC_TACTILE;
  }

  // If a comma-separated item contains force, map it to haptic-force.
  // Examples:
  // Force
  // haptic-force
  // Force (pressure)
  // Force (compression)
  if (value.includes("force") || value.includes("haptic-force")) {
    return SENSE_IDS.HAPTIC_FORCE;
  }

  if (
    value === "kinesthetic-motion" ||
    value === "kinesthetic motion" ||
    value === "kinaesthetic-motion" ||
    value === "kinaesthetic motion"
  ) {
    return SENSE_IDS.KINESTHETIC_MOTION;
  }

  if (value === "visual") return SENSE_IDS.VISUAL;
  if (value === "auditory") return SENSE_IDS.AUDITORY;
  if (value === "olfactory") return SENSE_IDS.OLFACTORY;

  if (value === "trigeminal nerve" || value === "trigeminal-nerve") {
    return SENSE_IDS.TRIGEMINAL_NERVE;
  }

  if (value === "gustatory") return SENSE_IDS.GUSTATORY;

  if (value === "body general" || value === "body-general") {
    return SENSE_IDS.BODY_GENERAL;
  }

  return null;
};

const parseSenses = (value, context = {}) => {
  if (isEmptySenseValue(value)) {
    return [SENSE_IDS.THERMAL_ALONE];
  }

  const rawValues = splitSenseValues(value);

  const mappedValues = [];
  const invalidValues = [];

  rawValues.forEach((rawValue) => {
    const mapped = mapSenseValue(rawValue);

    if (mapped) {
      mappedValues.push(mapped);
    } else {
      invalidValues.push(rawValue);
    }
  });

  if (invalidValues.length > 0) {
    const paperLabel = [context.doi, context.title].filter(Boolean).join(" / ");

    console.warn(
      `⚠️ [WARN] Invalid senses value${paperLabel ? ` (${paperLabel})` : ""}: ${invalidValues.join(
        ", ",
      )}`,
    );
  }

  const uniqueValues = Array.from(new Set(mappedValues));

  const nonThermalValues = uniqueValues.filter((sense) => sense !== "thermal");

  // Thermal-alone is only used when thermal is the only detected sense.
  if (nonThermalValues.length > 0) {
    return nonThermalValues;
  }

  if (uniqueValues.includes("thermal")) {
    return [SENSE_IDS.THERMAL_ALONE];
  }

  if (invalidValues.length > 0 && mappedValues.length === 0) {
    return [];
  }

  return [SENSE_IDS.THERMAL_ALONE];
};

module.exports = {
  parseSenses,
};
