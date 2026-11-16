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

// Filters are a row of dropdowns, one per category. These helpers drive
// them the way a person would: open the dropdown, then pick an option.
async function chooseFilter(page, category, value) {
  await page.click(`.filter-seg[data-category="${category}"] .filter-trigger`);
  await page.click(`.filter-seg[data-category="${category}"] .filter-option[data-value="${value}"]`);
}

async function clearFilter(page, category) {
  await page.click(`.filter-seg[data-category="${category}"] .filter-clear`);
}

check("filter dropdowns are grouped by category", async page => {
  const labels = (await page.locator(".filter-trigger").allTextContents()).map(t => t.trim());
  for (const expected of ["Protein", "Carbs", "Veg", "Dish", "Time"]) {
    assert.ok(labels.includes(expected), `missing "${expected}" filter dropdown`);
  }
  assert.ok(!labels.includes("Other"), "every tag should belong to a named group, not Other");
  const tops = await page.locator(".filter-seg").evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().top)));
  assert.equal(new Set(tops).size, 1, "expected every filter dropdown on one row");
});

check("choosing an ingredient filters the list and × clears it", async page => {
  const before = await page.locator(".recipe-list-item").count();
  await chooseFilter(page, "Protein", "chicken");
  assert.equal(await page.locator(".filter-menu:not([hidden])").count(), 0, "menu should close after choosing");
  const after = await page.locator(".recipe-list-item").count();
  assert.ok(after > 0 && after < before, `expected a filtered count between 0 and ${before}, got ${after}`);
  const label = await page.textContent('.filter-seg[data-category="Protein"] .filter-trigger-text');
  assert.equal(label.trim(), "Chicken", "expected the button to show the chosen option");
  await clearFilter(page, "Protein");
  assert.equal(await page.locator(".recipe-list-item").count(), before, "× did not reset the list");
  const reset = await page.textContent('.filter-seg[data-category="Protein"] .filter-trigger-text');
  assert.equal(reset.trim(), "Protein", "expected the button label to go back to the category");
});

check("choosing a time band filters the list", async page => {
  const before = await page.locator(".recipe-list-item").count();
  await chooseFilter(page, "Time", "under30");
  const after = await page.locator(".recipe-list-item").count();
  assert.ok(after > 0 && after <= before, `expected a filtered count between 0 and ${before}, got ${after}`);
  await chooseFilter(page, "Time", ""); // "All" also clears
  assert.equal(await page.locator(".recipe-list-item").count(), before, '"All" did not reset the list');
});

check("a new choice in the same dropdown replaces the old one", async page => {
  await chooseFilter(page, "Protein", "chicken");
  await chooseFilter(page, "Protein", "beef");
  const checked = await page.locator('.filter-seg[data-category="Protein"] .filter-option[aria-checked="true"]').getAttribute("data-value");
  assert.equal(checked, "beef", "expected beef to replace chicken");
  const cards = await page.locator(".recipe-list-item").count();
  assert.ok(cards > 0, "expected beef recipes, not an empty list from chicken AND beef");
  await clearFilter(page, "Protein");
});

check("no-results message shows when filters exclude everything", async page => {
  await chooseFilter(page, "Protein", "beef");
  await chooseFilter(page, "Veg", "vegetarian");
  const message = await page.locator(".no-results").textContent();
  assert.ok(message && message.length > 0, "expected a no-results message");
  await clearFilter(page, "Protein"); // reset
  await clearFilter(page, "Veg");
});

check("filter bar stays pinned to the top while scrolling the list", async page => {
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForFunction(() => document.querySelector(".filters").classList.contains("is-stuck"));
  const top = await page.evaluate(() => Math.round(document.querySelector(".filters").getBoundingClientRect().top));
  assert.equal(top, 0, `expected the filter bar at the top of the screen, got ${top}px`);
  await chooseFilter(page, "Protein", "chicken");
  const countTop = await page.evaluate(() => document.getElementById("results-count").getBoundingClientRect().top);
  const barBottom = await page.evaluate(() => document.querySelector(".filters").getBoundingClientRect().bottom);
  assert.ok(countTop >= barBottom - 1 && countTop < barBottom + 40, "expected new results to start just under the bar");
  await clearFilter(page, "Protein");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => !document.querySelector(".filters").classList.contains("is-stuck"));
});

check("filter dropdowns work from the keyboard", async page => {
  const trigger = page.locator('.filter-seg[data-category="Carbs"] .filter-trigger');
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await trigger.getAttribute("aria-expanded"), "true", "ArrowDown should open the menu");
  let focused = await page.evaluate(() => document.activeElement.dataset.value);
  assert.equal(focused, "", 'expected "All" focused when nothing is chosen');
  await page.keyboard.press("ArrowDown");
  focused = await page.evaluate(() => document.activeElement.dataset.value);
  await page.keyboard.press("Enter");
  assert.equal(await trigger.getAttribute("aria-expanded"), "false", "Enter should choose and close");
  const checked = await page.locator('.filter-seg[data-category="Carbs"] .filter-option[aria-checked="true"]').getAttribute("data-value");
  assert.equal(checked, focused, "Enter should choose the focused option");
  assert.ok(await trigger.evaluate(el => el === document.activeElement), "focus should return to the button");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  assert.equal(await trigger.getAttribute("aria-expanded"), "false", "Escape should close the menu");
  assert.ok(await trigger.evaluate(el => el === document.activeElement), "Escape should return focus to the button");
  await clearFilter(page, "Carbs");
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
  const statLabels = await page.locator(".stat-label").allTextContents();
  assert.ok(statLabels.includes("Cooked in"), `missing "Cooked in" stat, got: ${statLabels}`);
  await page.locator("#recipe-view .back-btn").click();
  await page.waitForSelector("#index", { state: "visible" });
});

check("opening and leaving a recipe animates and then cleans up", async page => {
  const supported = await page.evaluate(() => typeof document.startViewTransition === "function");
  await page.locator(".recipe-card-btn").first().click();
  if (supported) await page.waitForFunction(() => document.documentElement.dataset.nav === "forward");
  await page.waitForFunction(() => !document.documentElement.dataset.nav);
  assert.ok(await page.isVisible("#recipe-view"), "expected the recipe view after the transition");
  const dashLeft = () => page.evaluate(() => [...document.querySelectorAll(".masthead-dash")]
    .filter(el => el.offsetParent).map(el => Math.round(el.getBoundingClientRect().left))[0]);
  const recipeDashLeft = await dashLeft();
  await page.locator("#recipe-view .back-btn").click();
  if (supported) await page.waitForFunction(() => document.documentElement.dataset.nav === "back");
  await page.waitForFunction(() => !document.documentElement.dataset.nav);
  assert.ok(await page.isVisible("#index"), "expected the index after going back");
  assert.equal(await dashLeft(), recipeDashLeft, "the accent dash should keep the same left edge on both views, so it only moves vertically");
  const title = (await page.textContent("#site-title")).trim();
  assert.match(title, /Recipe collection/i, `unexpected index title: "${title}"`);
});

check("ingredients are a 2-column grid with equal-height cells", async page => {
  await page.locator(".recipe-card-btn").first().click();
  await page.waitForSelector("#recipe-view", { state: "visible" });
  const layout = await page.evaluate(() => {
    const grid = document.querySelector(".ingredients-grid");
    const items = [...grid.querySelectorAll(".ingredient")];
    const gridBox = grid.getBoundingClientRect();
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      heights: new Set(items.map(i => Math.round(i.getBoundingClientRect().height))).size,
      flush: items.every(i => {
        const b = i.getBoundingClientRect();
        return Math.round(b.left) === Math.round(gridBox.left) || Math.round(b.right) === Math.round(gridBox.right);
      }),
    };
  });
  assert.equal(layout.columns, 2, "expected 2 ingredient columns at desktop width");
  assert.equal(layout.heights, 1, "expected every ingredient cell to be the same height");
  assert.ok(layout.flush, "expected ingredient cells to reach the edges of the card");
  await page.locator("#recipe-view .back-btn").click();
  await page.waitForSelector("#index", { state: "visible" });
});

check("recipe jump bar scrolls to and highlights Method / Ingredients", async page => {
  await page.locator(".recipe-card-btn").first().click();
  await page.waitForSelector("#recipe-jump", { state: "visible" });
  const current = () => page.locator('.jump-btn[aria-current="true"]').textContent();
  assert.equal((await current()).trim(), "Ingredients", "expected Ingredients highlighted on open");
  await page.locator('.jump-btn[data-target="recipe-method"]').click();
  await page.waitForFunction(() => document.getElementById("recipe-method").getBoundingClientRect().top < 120);
  assert.equal((await current()).trim(), "Method", "expected Method highlighted after jumping to it");
  await page.locator('.jump-btn[data-target="recipe-ingredients"]').click();
  await page.waitForFunction(() => document.getElementById("recipe-ingredients").getBoundingClientRect().top < 120);
  assert.equal((await current()).trim(), "Ingredients", "expected Ingredients highlighted after jumping back");
  await page.locator("#recipe-view .back-btn").click();
  await page.waitForSelector("#index", { state: "visible" });
});

check("Copy list copies the same unchecked items as Send to WhatsApp", async page => {
  // Capture clipboard writes instead of relying on real clipboard
  // permissions in headless Chromium.
  await page.evaluate(() => {
    window.__copied = null;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async text => { window.__copied = text; } },
    });
  });
  await page.locator(".basket-toggle").first().click();
  await page.locator("#basket-badge").click();
  await page.waitForSelector("#shopping-list-view", { state: "visible" });
  const firstItem = page.locator(".shopping-item-checkbox").first();
  const tickedName = await firstItem.getAttribute("data-name");
  await firstItem.check();
  await page.locator(".copy-list-btn").click();
  await page.waitForFunction(() => window.__copied !== null);
  const copied = await page.evaluate(() => window.__copied);
  const waHref = await page.getAttribute(".whatsapp-btn", "href");
  const waText = decodeURIComponent(new URL(waHref).searchParams.get("text"));
  assert.equal(copied, waText, "expected copied text to match the WhatsApp text");
  const lines = copied.split("\n");
  assert.ok(!lines.includes(`- ${tickedName}`), `ticked item "${tickedName}" should be left out`);
  assert.equal(lines[2], "RECIPES", "expected the recipe list under the title");
  assert.ok(!/\(.+\)$/m.test(copied.split("\n\n").slice(2).join("\n")), "ingredient lines shouldn't name recipes");
  assert.match(await page.textContent(".copy-list-btn"), /Copied/, "expected copied confirmation");
  await page.locator(".clear-list-btn").click(); // reset
  await page.evaluate(() => { location.hash = ""; });
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
