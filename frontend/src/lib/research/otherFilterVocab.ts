/** Controlled vocabulary for “Other filters” facets (ids are stable keys; labels are UI copy). */

export type OtherFilterCategory =
  | "senses"
  | "materialsInContactWithSkin"
  | "thermalTransferModes";

export const OTHER_FILTER_CATEGORY_ORDER: OtherFilterCategory[] = [
  "senses",
  "materialsInContactWithSkin",
  "thermalTransferModes",
];

export type FilterOption = { id: string; label: string };

export const OTHER_FILTER_SECTION_TITLES: Record<OtherFilterCategory, string> =
  {
    senses: "Senses",
    materialsInContactWithSkin: "Materials in contact with skin",
    thermalTransferModes: "Thermal transfer modes",
  };

export const OTHER_FILTER_OPTIONS: Record<OtherFilterCategory, FilterOption[]> =
  {
    senses: [
      { id: "thermal-alone", label: "Thermal-alone" }, // thermal only; omitted when other senses are present
      { id: "haptic-tactile", label: "Haptic-Tactile" },
      { id: "haptic-force", label: "Haptic-Force" },
      { id: "kinesthetic-motion", label: "Kinesthetic/motion" },
      { id: "visual", label: "Visual" },
      { id: "auditory", label: "Auditory" },
      { id: "olfactory", label: "Olfactory" },
      { id: "trigeminal-nerve", label: "Trigeminal nerve" },
      { id: "gustatory", label: "Gustatory" },
      { id: "body-general", label: "Body (general)" },
    ],
    materialsInContactWithSkin: [
      { id: "metal", label: "Metal" },
      { id: "ceramic", label: "Ceramic" },
      { id: "fabrics-textiles", label: "Fabrics & Textiles" },
      { id: "latex", label: "Latex" },
      { id: "polymers-synthetics", label: "Polymers & Synthetics" },
      { id: "silicone-based", label: "Silicone-Based" },
      { id: "foam-cushioning", label: "Foam & Cushioning" },
      { id: "liquids-gels", label: "Liquids & Gels" },
      { id: "air-gas", label: "Air / Gas" },
      { id: "chemical", label: "Chemical" },
    ],
    thermalTransferModes: [
      { id: "conduction", label: "Conduction" },
      { id: "radiation", label: "Radiation" },
      { id: "convection", label: "Convection" },
    ],
  };

export function emptyOtherFilterSelections(): Record<
  OtherFilterCategory,
  string[]
> {
  return {
    senses: [],
    materialsInContactWithSkin: [],
    thermalTransferModes: [],
  };
}
