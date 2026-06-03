import { clientXToInsetNorm } from "@/components/range-slider/horizontalRangeTrackInset";

/** Seconds; filter range caps at one week (high handle shows 1wk+). */
export const DURATION_WEEK_S = 7 * 24 * 3600;
export const DURATION_MIN_S = 1;
export const DURATION_MAX_S = DURATION_WEEK_S;
/** Log axis for tick/label row only — extends past one week so "1week" sits left of the 1wk+ tail. */
export const DURATION_AXIS_LABEL_MAX_S = 14 * 24 * 3600;

const LOG_MAX = Math.log10(DURATION_MAX_S);
const LOG_LABEL_MAX = Math.log10(DURATION_AXIS_LABEL_MAX_S);
const LOG_BREAK = Math.log10(5);
const LOG_LONG_SPAN = LOG_MAX - LOG_BREAK;
const LOG_LABEL_LONG_SPAN = LOG_LABEL_MAX - LOG_BREAK;

/** 1s–5s uses a short linear prefix; 5s+ is log-scaled on the rest of the track. */
const DURATION_SHORT_BREAK_S = 5;
const DURATION_SHORT_VISUAL_FRACTION = 0.05;

/** Major ticks: readable units (5s … 1week; track still starts at 1s). */
export const DURATION_MAJOR_TICKS = [
  { s: 5, label: "5s", shortLabel: "5s", hideWhenSparse: true },
  { s: 10, label: "10s", shortLabel: "10s", hideWhenSparse: false },
  { s: 30, label: "30s", shortLabel: "30s", hideWhenSparse: true },
  { s: 60, label: "1min", shortLabel: "1m", hideWhenSparse: false },
  { s: 600, label: "10min", shortLabel: "10m", hideWhenSparse: false },
  { s: 3600, label: "1h", shortLabel: "1h", hideWhenSparse: false },
  { s: 86400, label: "1day", shortLabel: "1d", hideWhenSparse: false },
  { s: DURATION_WEEK_S, label: "1week", shortLabel: "1wk", hideWhenSparse: false },
] as const;

/** Convert duration seconds to normalized position (0..1) on the piecewise log axis. */
function durationToVisualNorm(seconds: number, logLongSpan: number): number {
  const s = clampDurationS(seconds);
  if (s <= DURATION_SHORT_BREAK_S) {
    const u = (s - DURATION_MIN_S) / (DURATION_SHORT_BREAK_S - DURATION_MIN_S);
    return u * DURATION_SHORT_VISUAL_FRACTION;
  }
  const logNorm = (Math.log10(s) - LOG_BREAK) / logLongSpan;
  return (
    DURATION_SHORT_VISUAL_FRACTION +
    Math.min(1, Math.max(0, logNorm)) * (1 - DURATION_SHORT_VISUAL_FRACTION)
  );
}

/** Convert normalized position (0..1) back to duration seconds on the piecewise log axis. */
function visualNormToDurationSeconds(
  norm: number,
  logLongSpan: number,
): number {
  const t = Math.min(1, Math.max(0, norm));
  if (t <= DURATION_SHORT_VISUAL_FRACTION) {
    const u = t / DURATION_SHORT_VISUAL_FRACTION;
    return clampDurationS(
      DURATION_MIN_S + u * (DURATION_SHORT_BREAK_S - DURATION_MIN_S),
    );
  }
  const logNorm =
    (t - DURATION_SHORT_VISUAL_FRACTION) / (1 - DURATION_SHORT_VISUAL_FRACTION);
  const logS = LOG_BREAK + logNorm * logLongSpan;
  return clampDurationS(Math.pow(10, logS));
}

/** Clamp duration seconds to the global domain. */
export function clampDurationS(seconds: number): number {
  return Math.min(DURATION_MAX_S, Math.max(DURATION_MIN_S, seconds));
}

/** Convert duration seconds to normalized position (0..1) on the piecewise log axis. */
export function durationToNorm(seconds: number): number {
  return durationToVisualNorm(seconds, LOG_LONG_SPAN);
}

/** Label/tick row only: 1week sits left of the track end reserved for 1wk+. */
export function durationToLabelNorm(seconds: number): number {
  return durationToVisualNorm(seconds, LOG_LABEL_LONG_SPAN);
}

/** Convert duration seconds to normalized position (0..1) on the piecewise log axis. */
export function durationTickNorm(seconds: number): number {
  return seconds === DURATION_WEEK_S
    ? durationToLabelNorm(seconds)
    : durationToNorm(seconds);
}

/** Convert normalized position (0..1) back to duration seconds on the piecewise log axis. */
export function normToDuration(norm: number): number {
  return visualNormToDurationSeconds(norm, LOG_LONG_SPAN);
}

/** Convert client X to duration seconds (after padding). */
export function clientXToDuration(clientX: number, rect: DOMRect): number {
  return normToDuration(clientXToInsetNorm(clientX, rect));
}

/** Minimum multiplicative gap between low and high (prevents collapsed range). */
export const DURATION_MIN_RATIO = 1.22;

/** Tooltip / summary text. */
export function formatDurationForUi(seconds: number): string {
  const s = clampDurationS(seconds);
  if (s < 60) return `${Math.round(s)}s`;
  const mins = s / 60;
  if (s < 3600) {
    const m = Math.round(mins);
    return m < 1 ? `${Math.round(s)}s` : `${m}min`;
  }
  const hrs = s / 3600;
  if (s < 86400) {
    const h = Math.round(hrs);
    if (h < 1) {
      const m = Math.round(mins);
      return m < 1 ? `${Math.round(s)}s` : `${m}min`;
    }
    return `${h}hr`;
  }
  const days = s / 86400;
  if (s < DURATION_MAX_S * 0.999) {
    const d = Math.round(days);
    if (d < 1) {
      const h = Math.round(hrs);
      return `${h}hr`;
    }
    return `${d}day`;
  }
  return "1wk+";
}
