const MATERIAL_IDS = {
  METAL: "metal",
  CERAMIC: "ceramic",
  FABRICS_TEXTILES: "fabrics-textiles",
  LATEX: "latex",
  POLYMERS_SYNTHETICS: "polymers-synthetics",
  SILICONE_BASED: "silicone-based",
  FOAM_CUSHIONING: "foam-cushioning",
  LIQUIDS_GELS: "liquids-gels",
  AIR_GAS: "air-gas",
  CHEMICAL: "chemical",
};

const normaliseMaterialValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/&/g, "and")
    .replace(/\s*\/\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const splitMaterialValues = (value) =>
  String(value ?? "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const isEmptyMaterialValue = (value) => {
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

const mapMaterialValue = (rawValue) => {
  const value = normaliseMaterialValue(rawValue);

  if (!value) return null;

  if (value.includes("metal")) {
    return MATERIAL_IDS.METAL;
  }

  if (value.includes("ceramic")) {
    return MATERIAL_IDS.CERAMIC;
  }

  if (
    value.includes("fabric") ||
    value.includes("textile") ||
    value.includes("fabrics") ||
    value.includes("textiles") ||
    value.includes("fabritcs&textiles") ||
    value.includes("fabrics & textiles") ||
    value.includes("fabricstextiles")
  ) {
    return MATERIAL_IDS.FABRICS_TEXTILES;
  }

  if (value.includes("latex")) {
    return MATERIAL_IDS.LATEX;
  }

  if (
    value.includes("polymer") ||
    value.includes("synthetic") ||
    value.includes("polymers") ||
    value.includes("synthetics") ||
    value.includes("polymers&synthetics") ||
    value.includes("polymers & synthetics") ||
    value.includes("polymerssynthetics")
  ) {
    return MATERIAL_IDS.POLYMERS_SYNTHETICS;
  }

  if (
    value.includes("silicone") ||
    value.includes("silicone-based") ||
    value.includes("silicone based") ||
    value.includes("siliconebased")
  ) {
    return MATERIAL_IDS.SILICONE_BASED;
  }

  if (
    value.includes("foam") ||
    value.includes("cushioning") ||
    value.includes("foam&cushioning") ||
    value.includes("foam & cushioning") ||
    value.includes("foamcushioning") ||
    value.includes("foam cushioning")
  ) {
    return MATERIAL_IDS.FOAM_CUSHIONING;
  }

  if (
    value.includes("liquid") ||
    value.includes("gel") ||
    value.includes("liquids") ||
    value.includes("gels") ||
    value.includes("liquids&gels") ||
    value.includes("liquids & gels") ||
    value.includes("liquidsgels")
  ) {
    return MATERIAL_IDS.LIQUIDS_GELS;
  }

  if (
    value.includes("air") ||
    value.includes("gas") ||
    value.includes("air&gas") ||
    value.includes("air & gas") ||
    value.includes("airgas")
  ) {
    return MATERIAL_IDS.AIR_GAS;
  }

  if (value.includes("chemical")) {
    return MATERIAL_IDS.CHEMICAL;
  }

  // Also allow exact frontend ids directly.
  const frontendId = value.replace(/\s+/g, "-");

  if (Object.values(MATERIAL_IDS).includes(frontendId)) {
    return frontendId;
  }

  return null;
};

const parseMaterialsInContactWithSkin = (value, context = {}) => {
  if (isEmptyMaterialValue(value)) {
    return [];
  }

  const rawValues = splitMaterialValues(value);

  const mappedValues = [];
  const invalidValues = [];

  rawValues.forEach((rawValue) => {
    const mapped = mapMaterialValue(rawValue);

    if (mapped) {
      mappedValues.push(mapped);
    } else {
      invalidValues.push(rawValue);
    }
  });

  if (invalidValues.length > 0) {
    const paperLabel = [context.doi, context.title].filter(Boolean).join(" / ");

    console.warn(
      `⚠️ [WARN] Invalid material value${paperLabel ? ` (${paperLabel})` : ""}: ${invalidValues.join(
        ", ",
      )}`,
    );
  }

  return Array.from(new Set(mappedValues));
};

module.exports = {
  parseMaterialsInContactWithSkin,
};
