import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BUILD_INDEX = path.join(ROOT, "build", "index.html");

// End-to-end smoke test against the built page — catches a broken
// onclick handler, a renamed class/id, or a filter/basket regression
// that `npm run build` alone (which only compiles YAML -> HTML) can't.
// Run via `npm test` (builds first) or directly once `build/` exists.

const checks = [];
function check(name, fn) {
  checks.push({ name, fn });
}

check("page loads with recipe cards", async page => {
  const count = await page.locator(".recipe-list-item").count();
  assert.ok(count > 0, "expected at least one recipe card");
});

check("ingredient filter chips are grouped by category", async page => {
  const labels = await page.locator(".filter-label").allTextContents();
  for (const expected of ["Meat", "Fish", "Veg", "Time"]) {
    assert.ok(labels.includes(expected), `missing "${expected}" filter group label`);
  }
});

check("clicking an ingredient chip filters the list", async page => {
  const before = await page.locator(".recipe-list-item").count();
  const chip = page.locator('.chip[data-tag="chicken"]');
  await chip.click();
  const after = await page.locator(".recipe-list-item").count();
  assert.ok(after > 0 && after < before, `expected a filtered count between 0 and ${before}, got ${after}`);
  await chip.click(); // reset
  const restored = await page.locator(".recipe-list-item").count();
  assert.equal(restored, before, "chip did not reset the list on second click");
});

check("clicking a time band chip filters the list", async page => {
  const before = await page.locator(".recipe-list-item").count();
  const chip = page.locator('.chip[data-band="under30"]');
  await chip.click();
  const after = await page.locator(".recipe-list-item").count();
  assert.ok(after > 0 && after <= before, `expected a filtered count between 0 and ${before}, got ${after}`);
  await chip.click(); // reset
});

check("no-results message shows when filters exclude everything", async page => {
  await page.click('.chip[data-tag="chicken"]');
  await page.click('.chip[data-tag="beef"]');
  const message = await page.locator(".no-results").textContent();
  assert.ok(message && message.length > 0, "expected a no-results message");
  await page.click('.chip[data-tag="chicken"]'); // reset
  await page.click('.chip[data-tag="beef"]');
});

check("adding a recipe to the basket updates the icon and badge", async page => {
  const toggle = page.locator(".basket-toggle").first();
  await toggle.click();
  await page.waitForSelector(".basket-badge:not([hidden])");
  const badgeText = await page.textContent("#basket-badge");
  assert.match(badgeText, /Shopping list \(1\)/, `unexpected badge text: "${badgeText}"`);
  const isActive = await page.locator(".basket-toggle.active").count();
  assert.equal(isActive, 1, "expected exactly one active basket-toggle");
  await page.locator(".basket-toggle.active").click(); // reset
  const hidden = await page.getAttribute("#basket-badge", "hidden");
  assert.notEqual(hidden, null, "expected badge to hide again once basket is empty");
});

check("opening a recipe shows its detail view", async page => {
  await page.locator(".recipe-card-btn").first().click();
  await page.waitForSelector("#recipe-view", { state: "visible" });
  const title = await page.textContent("#recipe-title");
  assert.ok(title && title.trim().length > 0, "expected a non-empty recipe title");
  const stepCount = await page.locator(".step").count();
  assert.ok(stepCount > 0, "expected at least one method step");
  await page.locator("#recipe-view .back-btn").click();
  await page.waitForSelector("#index", { state: "visible" });
});

async function main() {
  if (!fs.existsSync(BUILD_INDEX)) {
    console.error(`build/index.html not found — run \`npm run build\` first.`);
    process.exit(1);
  }

  // Normally left unset — Playwright resolves its own installed browser.
  // Escape hatch for environments with a pre-provisioned Chromium at a
  // fixed, non-standard path (e.g. a sandboxed CI image).
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
  await page.goto(`file://${BUILD_INDEX}`);

  const failures = [];
  for (const { name, fn } of checks) {
    try {
      await fn(page);
      console.log(`  ok  ${name}`);
    } catch (err) {
      failures.push({ name, err });
      console.error(`FAIL  ${name}\n      ${err.message}`);
    }
  }

  await browser.close();

  console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);
  if (failures.length) process.exit(1);
}

main();
