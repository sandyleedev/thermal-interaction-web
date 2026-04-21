import { clientXToInsetNorm } from "@/components/range-slider/horizontalRangeTrackInset";

/** Seconds; wide span (1s … 1 week) mapped logarithmically on the slider. */
export const DURATION_MIN_S = 1;
export const DURATION_MAX_S = 7 * 24 * 3600;

const LOG_MIN = Math.log10(DURATION_MIN_S);
const LOG_MAX = Math.log10(DURATION_MAX_S);
const LOG_SPAN = LOG_MAX - LOG_MIN;

/** Major ticks: readable units on a log axis (1s … 1wk). */
export const DURATION_MAJOR_TICKS = [
  { s: 1, label: "1s" },
  { s: 10, label: "10s" },
  { s: 60, label: "1min" },
  { s: 600, label: "10min" },
  { s: 3600, label: "1hr" },
  { s: 21600, label: "6hr" },
  { s: 86400, label: "1d" },
  { s: DURATION_MAX_S, label: "1wk" },
] as const;

export function clampDurationS(seconds: number): number {
  return Math.min(DURATION_MAX_S, Math.max(DURATION_MIN_S, seconds));
}

export function durationToNorm(seconds: number): number {
  const s = clampDurationS(seconds);
  return (Math.log10(s) - LOG_MIN) / LOG_SPAN;
}

export function normToDuration(norm: number): number {
  const t = Math.min(1, Math.max(0, norm));
  return clampDurationS(Math.pow(10, LOG_MIN + t * LOG_SPAN));
}

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
