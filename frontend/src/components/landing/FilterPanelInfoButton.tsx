import { useEffect, useId, useRef, useState } from "react";

type FilterPanelInfoButtonProps = {
  tooltip: string;
  /** Accessible name when different from default. */
  ariaLabel?: string;
};

/** Circled “i” with click/tap tooltip for filter panel headers. */
export function FilterPanelInfoButton({
  tooltip,
  ariaLabel = "How this filter works",
}: FilterPanelInfoButtonProps) {
  const tooltipId = useId();
  const [tipOpen, setTipOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tipOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setTipOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [tipOpen]);

  useEffect(() => {
    if (!tipOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTipOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tipOpen]);

  return (
    <div
      ref={wrapRef}
      className={[
        "other-filters-info-wrap",
        tipOpen && "other-filters-info-wrap--open",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="other-filters-info-btn"
        aria-label={ariaLabel}
        aria-expanded={tipOpen}
        aria-controls={tooltipId}
        onClick={() => setTipOpen((v) => !v)}
      >
        <span className="other-filters-info-icon" aria-hidden>
          {"\u24D8"}
        </span>
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        className="other-filters-info-tooltip"
      >
        {tooltip}
      </div>
    </div>
  );
}
