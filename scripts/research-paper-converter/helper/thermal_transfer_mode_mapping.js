const THERMAL_TRANSFER_MODE_IDS = {
  CONDUCTION: "conduction",
  RADIATION: "radiation",
  CONVECTION: "convection",
};

const normaliseThermalTransferModeValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitThermalTransferModeValues = (value) =>
  String(value ?? "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const isEmptyThermalTransferModeValue = (value) => {
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

const mapThermalTransferModeValue = (rawValue) => {
  const value = normaliseThermalTransferModeValue(rawValue);

  if (!value) return null;

  if (value.includes("conduction")) {
    return THERMAL_TRANSFER_MODE_IDS.CONDUCTION;
  }

  if (value.includes("radiation")) {
    return THERMAL_TRANSFER_MODE_IDS.RADIATION;
  }

  if (value.includes("convection")) {
    return THERMAL_TRANSFER_MODE_IDS.CONVECTION;
  }

  // Also allow exact frontend ids directly.
  if (Object.values(THERMAL_TRANSFER_MODE_IDS).includes(value)) {
    return value;
  }

  return null;
};

const parseThermalTransferModes = (value, context = {}) => {
  if (isEmptyThermalTransferModeValue(value)) {
    return [];
  }

  const rawValues = splitThermalTransferModeValues(value);

  const mappedValues = [];
  const invalidValues = [];

  rawValues.forEach((rawValue) => {
    const mapped = mapThermalTransferModeValue(rawValue);

    if (mapped) {
      mappedValues.push(mapped);
    } else {
      invalidValues.push(rawValue);
    }
  });

  if (invalidValues.length > 0) {
    const paperLabel = [context.doi, context.title].filter(Boolean).join(" / ");

    console.warn(
      `[WARN] Invalid thermal transfer mode${paperLabel ? ` (${paperLabel})` : ""}: ${invalidValues.join(
        ", ",
      )}`,
    );
  }

  return Array.from(new Set(mappedValues));
};

module.exports = {
  parseThermalTransferModes,
};
