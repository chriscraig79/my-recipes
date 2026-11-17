// Renders an illustration SVG to the WebP the site uses, plus a review sheet
// showing the full image and the two crops the site applies (4:3 index card,
// 16:9 recipe hero).
//
//   node render.mjs <in.svg> <out.webp> [review.png]
//
// Needs the repo's Playwright (npm install, then npx playwright install chromium).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const [input, output, reviewPath = path.join(os.tmpdir(), path.basename(output, path.extname(output)) + "-review.png")] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node render.mjs <in.svg> <out.webp> [review.png]");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto("file://" + path.resolve(input));
await page.waitForTimeout(300);
const png = await page.screenshot();

// Encode in the browser: canvas can write WebP, and a data: URL keeps the canvas untainted.
await page.goto("about:blank");
const { webp, review } = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const full = document.createElement("canvas");
  full.width = 1600; full.height = 1000;
  full.getContext("2d").drawImage(img, 0, 0);
  const webp = full.toDataURL("image/webp", 0.82);

  // Review sheet: full image, 4:3 card crop, 16:9 hero crop (object-fit: cover, centred).
  const sheet = document.createElement("canvas");
  sheet.width = 1600 + 40; sheet.height = 1000 + 600 + 60;
  const g = sheet.getContext("2d");
  g.fillStyle = "#faf7f2"; g.fillRect(0, 0, sheet.width, sheet.height);
  g.drawImage(img, 20, 20, 1600, 1000);
  const cover = (x, y, w, h) => {
    const s = Math.max(w / 1600, h / 1000), sw = w / s, sh = h / s;
    g.drawImage(img, (1600 - sw) / 2, (1000 - sh) / 2, sw, sh, x, y, w, h);
    g.strokeStyle = "#d9cfc0"; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  };
  cover(20, 1040, 800, 600);   // 4:3
  cover(840, 1040, 780, 439);  // 16:9
  return { webp, review: sheet.toDataURL("image/png") };
}, "data:image/png;base64," + png.toString("base64"));
await browser.close();

fs.writeFileSync(output, Buffer.from(webp.split(",")[1], "base64"));
fs.writeFileSync(reviewPath, Buffer.from(review.split(",")[1], "base64"));
console.log(`Wrote ${output} (${Math.round(fs.statSync(output).size / 1024)}KB) and review sheet ${reviewPath}`);
