/**
 * GitHub Pages has no server-side fallback for client routes. Copy index.html to
 * 404.html so direct links (e.g. /paper/2) load the SPA; React Router reads the URL.
 */
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(import.meta.dirname, "..", "dist");
copyFileSync(resolve(distDir, "index.html"), resolve(distDir, "404.html"));
