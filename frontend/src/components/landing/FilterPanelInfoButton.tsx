import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

type FilterPanelInfoButtonProps = {
  tooltip: string;
  /** Accessible name when different from default. */
  ariaLabel?: string;
  /** Render tooltip in a body portal so it clears nested stacking contexts. */
  floating?: boolean;
  tooltipPlacement?: "below" | "above";
};

const FLOATING_TOOLTIP_GAP_PX = 6;
const HOVER_CLOSE_DELAY_MS = 100;

function floatingTooltipStyle(
  button: HTMLButtonElement,
  tooltipPlacement: "below" | "above",
): CSSProperties {
  const rect = button.getBoundingClientRect();
  return {
    top:
      tooltipPlacement === "above"
        ? rect.top - FLOATING_TOOLTIP_GAP_PX
        : rect.bottom + FLOATING_TOOLTIP_GAP_PX,
    left: rect.left,
  };
}

/** Circled “i” with hover/focus tooltip for filter panels. */
export function FilterPanelInfoButton({
  tooltip,
  ariaLabel = "How this filter works",
  floating = false,
  tooltipPlacement = "below",
}: FilterPanelInfoButtonProps) {
  const tooltipId = useId();
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpFloatingLayout = useCallback(() => {
    setLayoutVersion((version) => version + 1);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const showFloatingTip = useCallback(() => {
    clearCloseTimer();
    setFloatingOpen(true);
    bumpFloatingLayout();
  }, [bumpFloatingLayout, clearCloseTimer]);

  const hideFloatingTipSoon = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setFloatingOpen(false);
      closeTimerRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useLayoutEffect(() => {
    if (!floating || !floatingOpen) return;
    const onLayoutChange = () => bumpFloatingLayout();
    window.addEventListener("scroll", onLayoutChange, true);
    window.addEventListener("resize", onLayoutChange);
    return () => {
      window.removeEventListener("scroll", onLayoutChange, true);
      window.removeEventListener("resize", onLayoutChange);
    };
  }, [floating, floatingOpen, bumpFloatingLayout]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const tooltipClassName = [
    "other-filters-info-tooltip",
    floating && "other-filters-info-tooltip--floating",
    floating &&
      tooltipPlacement === "above" &&
      "other-filters-info-tooltip--above",
  ]
    .filter(Boolean)
    .join(" ");

  const floatingStyle =
    floating && floatingOpen && buttonRef.current
      ? floatingTooltipStyle(buttonRef.current, tooltipPlacement)
      : null;
  void layoutVersion;

  const floatingHoverHandlers = floating
    ? {
        onMouseEnter: showFloatingTip,
        onMouseLeave: hideFloatingTipSoon,
      }
    : undefined;

  return (
    <div ref={wrapRef} className="other-filters-info-wrap" {...floatingHoverHandlers}>
      <button
        ref={buttonRef}
        type="button"
        className="other-filters-info-btn"
        aria-label={ariaLabel}
        aria-describedby={floating && floatingOpen ? tooltipId : undefined}
        onFocus={floating ? showFloatingTip : undefined}
        onBlur={floating ? hideFloatingTipSoon : undefined}
      >
        <span className="other-filters-info-icon" aria-hidden>
          {"\u24D8"}
        </span>
      </button>
      {!floating && (
        <div
          id={tooltipId}
          role="tooltip"
          className={tooltipClassName}
        >
          {tooltip}
        </div>
      )}
      {floating &&
        floatingOpen &&
        floatingStyle &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            className={tooltipClassName}
            style={floatingStyle}
            onMouseEnter={showFloatingTip}
            onMouseLeave={hideFloatingTipSoon}
          >
            {tooltip}
          </div>,
          document.body,
        )}
    </div>
  );
}
