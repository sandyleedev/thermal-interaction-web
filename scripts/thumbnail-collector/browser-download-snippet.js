/**
 * Paste this entire file into the browser DevTools console on an ACM HTML
 * paper page, then press Enter in the terminal running `npm run process`.
 *
 * Downloads the first figure image from section.body into ~/Downloads.
 */
(() => {
  const doi = location.pathname.split("/").pop() || "image";
  const safeDoi = doi.replace(/[\/\\?%*:|"<>]/g, "_");

  const img =
    document.querySelector("section.body figure img") ||
    document.querySelector("main section.body figure img") ||
    document.querySelector("section.body img");

  if (!img) {
    console.log("No target image found");
    return;
  }

  const src = img.currentSrc || img.src;
  if (!src) {
    console.log("Image src not found");
    return;
  }

  const lowerSrc = src.toLowerCase();
  let ext = ".jpg";
  if (lowerSrc.includes(".png")) ext = ".png";
  else if (lowerSrc.includes(".webp")) ext = ".webp";
  else if (lowerSrc.includes(".jpeg")) ext = ".jpeg";
  else if (lowerSrc.includes(".jpg")) ext = ".jpg";

  const a = document.createElement("a");
  a.href = src;
  a.download = `${safeDoi}${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log("Downloading:", a.download);
  console.log("Image src:", src);
})();
