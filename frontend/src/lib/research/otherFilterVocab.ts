/** Controlled vocabulary for “Other filters” facets (ids are stable keys; labels are UI copy). */

export type OtherFilterCategory =
  | "senses"
  | "purposes"
  | "materials"
  | "thermalModes"
  | "actuationMethods";

export const OTHER_FILTER_CATEGORY_ORDER: OtherFilterCategory[] = [
  "senses",
  "purposes",
  "materials",
  "thermalModes",
  "actuationMethods",
];

export type FilterOption = { id: string; label: string };

export const OTHER_FILTER_SECTION_TITLES: Record<OtherFilterCategory, string> =
  {
    senses: "Senses",
    purposes: "Purposes",
    materials: "Materials",
    thermalModes: "Thermal transfer modes",
    actuationMethods: "Actuation methods",
  };

export const OTHER_FILTER_OPTIONS: Record<OtherFilterCategory, FilterOption[]> =
  {
    senses: [
      { id: "haptic", label: "haptic" },
      { id: "vision", label: "vision" },
      { id: "audio", label: "audio" },
      { id: "smell", label: "smell" },
      { id: "taste", label: "taste" },
    ],
    purposes: [
      { id: "improving-authenticity", label: "Improving authenticity" },
      {
        id: "expanding-sensory-experience",
        label: "Expanding sensory experience",
      },
      { id: "studying-perception", label: "Studying perception" },
      { id: "supporting-interaction", label: "Supporting interaction" },
      {
        id: "enhancing-emotional-experience",
        label: "Enhancing emotional experience",
      },
      {
        id: "augmenting-human-perception",
        label: "Augmenting human perception",
      },
      { id: "exploring-design-space", label: "Exploring design space" },
    ],
    materials: [
      { id: "metal", label: "Metal" },
      { id: "ceramic", label: "Ceramic" },
      { id: "fabric", label: "Fabric" },
      { id: "polymer", label: "Polymer" },
      { id: "liquid", label: "Liquid" },
      { id: "air", label: "Air" },
      { id: "chemical", label: "Chemical" },
    ],
    thermalModes: [
      { id: "conduction", label: "Conduction" },
      { id: "radiation", label: "Radiation" },
      { id: "convection", label: "Convection" },
    ],
    actuationMethods: [
      { id: "peltier-module", label: "peltier module" },
      { id: "heat-pad", label: "heat pad" },
      { id: "heating-element", label: "heating element" },
      { id: "water", label: "water" },
      { id: "gel-pack", label: "gel pack" },
      { id: "airflow", label: "airflow" },
      { id: "heated-air", label: "heated air" },
      { id: "radiant-heating", label: "radiant heating" },
      { id: "chemical", label: "chemical" },
      { id: "environmental-heat", label: "environmental heat" },
      { id: "cooling-device", label: "cooling device" },
    ],
  };

export function emptyOtherFilterSelections(): Record<
  OtherFilterCategory,
  string[]
> {
  return {
    senses: [],
    purposes: [],
    materials: [],
    thermalModes: [],
    actuationMethods: [],
  };
}
