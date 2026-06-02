import { sliderLeftForNorm } from "@/components/range-slider/horizontalRangeSliderLayout";

type RangeSliderThumbStackProps = {
  side: "low" | "high";
  norm: number;
  handlesClose: boolean;
  /** When true, offset the value pill so low/high labels do not overlap. */
  spreadPill: boolean;
  nearEdge: boolean;
  handleClassName: string;
  ariaLabel: string;
  pillText: string;
  onPointerDown: (e: React.PointerEvent) => void;
  insetPx?: number;
};

/** Low or high handle + value pill for horizontal range sliders. */
export function RangeSliderThumbStack({
  side,
  norm,
  handlesClose,
  spreadPill,
  nearEdge,
  handleClassName,
  ariaLabel,
  pillText,
  onPointerDown,
  insetPx = 0,
}: RangeSliderThumbStackProps) {
  const edgeClass =
    side === "low"
      ? nearEdge && "range-slider-value-pill--edge-left"
      : nearEdge && "range-slider-value-pill--edge-right";

  return (
    <div
      className={[
        "range-slider-thumb-stack",
        "range-slider-thumb-stack--horizontal",
        side === "low"
          ? "range-slider-thumb-stack--low"
          : "range-slider-thumb-stack--high",
        handlesClose && "range-slider-thumb-stack--spread",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ left: sliderLeftForNorm(norm, insetPx) }}
    >
      <button
        type="button"
        className={handleClassName}
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
      />
      <span
        className={[
          "range-slider-value-pill",
          spreadPill &&
            (side === "low"
              ? "range-slider-value-pill--spread-low"
              : "range-slider-value-pill--spread-high"),
          edgeClass,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
      >
        {pillText}
      </span>
    </div>
  );
}
