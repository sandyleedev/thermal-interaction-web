/** Key for the scroll position in session storage. */
const LANDING_SCROLL_KEY = "landing-scroll-y";

/** Save the current scroll position to session storage. */
export function saveLandingScrollPosition(): void {
  sessionStorage.setItem(LANDING_SCROLL_KEY, String(window.scrollY));
}

/** Restore the saved scroll position from session storage. */
export function consumeLandingScrollRestore(): number | null {
  const raw = sessionStorage.getItem(LANDING_SCROLL_KEY);
  sessionStorage.removeItem(LANDING_SCROLL_KEY);
  if (raw == null) return null;
  const y = Number(raw);
  return Number.isFinite(y) && y >= 0 ? y : null;
}
