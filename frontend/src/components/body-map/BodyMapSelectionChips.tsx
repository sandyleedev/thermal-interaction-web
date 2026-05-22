import { bodyMapChipLabel } from "@/lib/research/bodyMapChipLabels";
import {
  bodyMapChipKey,
  type BodyMapChipSelection,
} from "@/lib/research/bodyMapChipSelection";

type BodyMapSelectionChipsProps = {
  chips: readonly BodyMapChipSelection[];
  onRemoveChip: (chip: BodyMapChipSelection) => void;
};

export function BodyMapSelectionChips({
  chips,
  onRemoveChip,
}: BodyMapSelectionChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className="body-map-selection-chips"
      role="list"
      aria-label="Selected body regions"
    >
      {chips.map((chip) => (
          <span
            key={bodyMapChipKey(chip)}
            className="body-map-selection-chip"
            role="listitem"
          >
            <span className="body-map-selection-chip-label">
              {bodyMapChipLabel(chip)}
            </span>
            <button
              type="button"
              className="body-map-selection-chip-dismiss"
              onClick={() => onRemoveChip(chip)}
              aria-label={`Remove ${bodyMapChipLabel(chip)}`}
            >
              ×
            </button>
          </span>
      ))}
    </div>
  );
}
