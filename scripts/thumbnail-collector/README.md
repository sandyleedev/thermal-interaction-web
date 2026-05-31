# 🏞️ Thumbnail Collector

Scripts for collecting paper thumbnail images and handling manual screenshot capture for skipped cases.

## Setup

Install dependencies:

**npm install**

## Files

- process.js: Handles the normal workflow for downloading images from HTML pages.
- browser-download-snippet.js: DevTools console snippet for ACM HTML paper pages.
- process-skipped.js: Handles skipped rows that require manual PDF viewer screenshots.
- targets.sample.csv: Sample CSV file structure.
- targets.csv: Working file used locally. This is ignored by Git.
- output/: Output folder for renamed image files.

## CSV format

Expected columns:

id,doi,url,status,image_file,notes

## Normal workflow

Run:

**npm run process**

For each pending row:

1. Open the URL in your browser.
2. Navigate to the HTML page.
3. Paste `browser-download-snippet.js` into the browser DevTools console (or copy from terminal output).
4. Return to the terminal and press Enter.
5. The script moves the latest downloaded image into output/ and renames it using the DOI.

## Skipped workflow

Run:

**npm run process:skipped**

For skipped rows:

1. Open the URL in your browser.
2. Capture the PDF viewer manually.
3. Save the screenshot.
4. Return to the terminal and press Enter.
5. The script finds the new screenshot in the screenshots folder, moves it into output/, and renames it using the DOI.

## Notes

- Update the screenshots directory in process-skipped.js if your screenshots are saved to a different folder.
- targets.csv is ignored by Git.
- output/ is ignored by Git.
