/**
 * Resolve a path under `public/` for the current Vite `base` (local `/`, Pages `/repo/`).
 * Accepts `body-map/foo.svg` or `/body-map/foo.svg`.
 */
export function publicAssetUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${normalized}`;
}
