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

// Search is debounced, so wait until the page has applied the query.
async function search(page, text) {
  await page.fill("#recipe-search", text);
  await page.waitForFunction(q => searchQuery === q, text.trim());
}

check("search finds recipes by title, tag or ingredient and combines with filters", async page => {
  const total = await page.locator(".recipe-list-item").count();
  await search(page, "lentil");
  const titles = await page.locator(".recipe-card-title").allTextContents();
  assert.ok(titles.length > 0 && titles.length < total, `expected a few lentil recipes, got ${titles.length}`);
  assert.ok(titles.some(t => /lentil/i.test(t)), "expected the lentil gnocchi ragu among the results");
  assert.equal((await page.textContent("#results-count")).trim(), `${titles.length} recipe${titles.length === 1 ? "" : "s"}`);
  // Case- and accent-insensitive.
  await search(page, "LENTÍL");
  assert.equal(await page.locator(".recipe-list-item").count(), titles.length, "case and accents should be ignored");
  // Ingredient-only match: a word that's only in an ingredient name.
  const ingredientOnly = await page.evaluate(() => {
    const r = recipes.find(r => r.ingredients.some(i => !r.title.toLowerCase().includes(i.name.toLowerCase())));
    return r.ingredients.find(i => !r.title.toLowerCase().includes(i.name.toLowerCase())).name;
  });
  await search(page, ingredientOnly);
  assert.ok(await page.locator(".recipe-list-item").count() > 0, `expected "${ingredientOnly}" to match by ingredient`);
  // Combined with a dropdown filter.
  await search(page, "curry");
  const curries = await page.locator(".recipe-list-item").count();
  await chooseFilter(page, "Protein", "chicken");
  const chickenCurries = await page.locator(".recipe-list-item").count();
  assert.ok(chickenCurries > 0 && chickenCurries <= curries, "search and filter should combine");
  await clearFilter(page, "Protein");
  // No results offers a Clear search action that resets the list.
  await search(page, "zzznothing");
  assert.match(await page.textContent(".no-results"), /zzznothing/);
  await page.click(".no-results-action");
  assert.equal(await page.locator(".recipe-list-item").count(), total, "Clear search did not reset the list");
  assert.equal(await page.inputValue("#recipe-search"), "");
  assert.ok(await page.evaluate(() => document.activeElement.id === "recipe-search"), "focus should go back to the search field");
  await page.evaluate(() => document.activeElement.blur());
});

check("pressing / focuses search; it doesn't fire while typing elsewhere", async page => {
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press("/");
  assert.ok(await page.evaluate(() => document.activeElement.id === "recipe-search"), "/ should focus search");
  await page.keyboard.type("a/b");
  assert.equal(await page.inputValue("#recipe-search"), "a/b", "/ should type normally inside the field");
  await search(page, "");
  await page.evaluate(() => document.activeElement.blur());
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

check("step numbers link to #recipe/step-N and the link scrolls to and rings that step", async page => {
  await page.locator(".recipe-card-btn").first().click();
  await page.waitForSelector("#recipe-jump", { state: "visible" });
  const recipeId = decodeURIComponent((await page.evaluate(() => location.hash)).slice(1));
  const link = page.locator("#step-2 .step-number");
  assert.equal(await link.getAttribute("href"), `#${recipeId}/step-2`, "expected step 2's number to link to its anchor");
  await link.click();
  await page.waitForFunction(() => document.querySelector("#step-2.is-target") && document.activeElement?.id === "step-2");
  await page.waitForFunction(() => Math.abs(document.getElementById("step-2").getBoundingClientRect().top - 100) < 60);
  assert.equal(await page.locator(".step.is-target").count(), 1, "expected only the linked step to be ringed");
  // Tapping the body of a card (not the number) follows the same link.
  await page.locator("#step-3 .step-content").click();
  await page.waitForFunction(id => location.hash === `#${id}/step-3` && document.querySelector("#step-3.is-target"), recipeId);
  assert.equal(await page.locator(".step.is-target").count(), 1, "expected the ring to move to the tapped step");
  // Opening a step URL directly (a shared link) renders the recipe at that step.
  await page.evaluate(() => { location.hash = ""; });
  await page.waitForSelector("#index", { state: "visible" });
  await page.evaluate(id => { location.hash = `${id}/step-3`; }, recipeId);
  await page.waitForFunction(() => document.querySelector("#step-3.is-target"));
  await page.locator("#recipe-view .back-btn").click();
  await page.waitForSelector("#index", { state: "visible" });
});

check("adding to the shopping list from a recipe page keeps scroll, focus and the step ring (#47)", async page => {
  await page.locator(".recipe-card-btn").first().click();
  await page.waitForSelector("#recipe-jump", { state: "visible" });
  await page.locator("#step-2 .step-number").click();
  await page.waitForFunction(() => document.querySelector("#step-2.is-target"));
  const toggle = page.locator(".basket-toggle-large");
  await toggle.scrollIntoViewIfNeeded();
  await toggle.focus();
  const before = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("Enter");
  assert.equal(await toggle.getAttribute("aria-pressed"), "true", "expected aria-pressed to flip to true");
  assert.match(await toggle.textContent(), /In shopping list/);
  assert.equal(await page.evaluate(() => window.scrollY), before, "scroll position changed");
  assert.ok(await toggle.evaluate(el => el === document.activeElement), "focus moved away from the toggle");
  assert.equal(await page.locator("#step-2.is-target").count(), 1, "step highlight was cleared");
  assert.match(await page.textContent("#basket-badge"), /\(1\)/, "badge didn't update");
  await page.keyboard.press("Enter"); // reset
  assert.equal(await toggle.getAttribute("aria-pressed"), "false");
  assert.ok(await toggle.evaluate(el => el === document.activeElement), "focus moved away after the second toggle");
  await page.locator("#recipe-view .back-btn").click();
  await page.waitForSelector("#index", { state: "visible" });
  assert.equal(await page.locator(".basket-toggle.active").count(), 0, "index toggles out of sync with the basket");
});

check("recipe text is rendered as text, never as HTML", async page => {
  await page.evaluate(() => {
    window.__xss = false;
    const evil = '<img src=x onerror="window.__xss=true">';
    recipes.push({
      id: "smoke-escape", title: `Escape ${evil}`, titleHtml: "Escape <em>test</em>", label: evil,
      servings: "1", time: "5 min", timeMins: 5, cookedIn: "Hob", description: evil, tags: [],
      ingredients: [{ name: evil, amount: evil, prep: evil, section: "Other" }],
      steps: [{ title: evil, content: evil, timer: evil }], notes: evil,
    });
    location.hash = "smoke-escape";
  });
  await page.waitForSelector("#recipe-view", { state: "visible" });
  assert.equal(await page.locator("#recipe-content img").count(), 0, "markup from recipe text became an element");
  assert.match(await page.textContent(".notes-box"), /<img src=x/, "expected the markup shown as literal text");
  assert.equal(await page.evaluate(() => window.__xss), false, "an onerror handler ran");
  await page.evaluate(() => { recipes.pop(); location.hash = ""; });
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
