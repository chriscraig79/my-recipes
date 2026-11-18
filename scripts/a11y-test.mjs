import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_INDEX = path.join(__dirname, "..", "build", "index.html");

// Automated accessibility checks (axe-core) against every view and state of
// the built page, at phone and desktop widths. Fails on serious or critical
// WCAG 2.2 A/AA violations; moderate and minor ones are printed but don't
// fail. Automated checks only catch part of the picture — see the manual
// checklist in the README for bigger UI changes.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const BLOCKING = new Set(["serious", "critical"]);

const WIDTHS = [
  { name: "mobile", viewport: { width: 390, height: 844 } },
  { name: "desktop", viewport: { width: 1280, height: 900 } },
];

async function openIndex(page) {
  await page.evaluate(() => { localStorage.clear(); location.hash = ""; });
  await page.reload();
  await page.waitForSelector(".recipe-list-item");
}

async function chooseFilter(page, category, value) {
  await page.click(`.filter-seg[data-category="${category}"] .filter-trigger`);
  await page.click(`.filter-seg[data-category="${category}"] .filter-option[data-value="${value}"]`);
}

async function openFirstRecipe(page) {
  await page.locator(".recipe-card-btn").first().click();
  await page.waitForSelector("#recipe-view", { state: "visible" });
  await page.waitForFunction(() => !document.documentElement.dataset.nav);
}

const STATES = [
  { name: "index", setup: openIndex },
  { name: "index with filters applied", setup: async page => {
    await openIndex(page);
    await chooseFilter(page, "Protein", "chicken");
    await chooseFilter(page, "Time", "under30");
  } },
  { name: "index with no results", setup: async page => {
    await openIndex(page);
    await page.click("#search-toggle");
    await page.fill("#recipe-search", "zzznothing");
    await page.waitForSelector(".no-results");
  } },
  { name: "index with search open", setup: async page => {
    await openIndex(page);
    await page.click("#search-toggle");
    await page.fill("#recipe-search", "chicken");
    await page.waitForFunction(() => searchQuery === "chicken");
  } },
    { name: "index with a filter dropdown open", setup: async page => {
    await openIndex(page);
    await page.click('.filter-seg[data-category="Protein"] .filter-trigger');
    await page.waitForSelector(".filter-menu:not([hidden])");
  } },
  { name: "recipe page", setup: async page => {
    await openIndex(page);
    await openFirstRecipe(page);
  } },
  { name: "recipe opened at a step link", setup: async page => {
    await openIndex(page);
    const id = await page.evaluate(() => recipes[0].id);
    await page.evaluate(id => { location.hash = `${id}/step-2`; }, id);
    await page.waitForSelector("#step-2.is-target");
  } },
  { name: "shopping list (empty)", setup: async page => {
    await openIndex(page);
    await page.evaluate(() => { location.hash = "shopping-list"; });
    await page.waitForSelector("#shopping-list-view", { state: "visible" });
  } },
  { name: "shopping list (populated, one item ticked)", setup: async page => {
    await openIndex(page);
    await page.locator(".basket-toggle").nth(0).click();
    await page.locator(".basket-toggle").nth(1).click();
    await page.evaluate(() => { location.hash = "shopping-list"; });
    await page.waitForSelector(".shopping-item-checkbox");
    await page.locator(".shopping-item-checkbox").first().check();
  } },
];

function describe(v) {
  const targets = v.nodes.slice(0, 3).map(n => n.target.join(" ")).join(", ");
  const more = v.nodes.length > 3 ? ` (+${v.nodes.length - 3} more)` : "";
  return `[${v.impact}] ${v.id}: ${v.help} — ${targets}${more}\n        ${v.helpUrl}`;
}

async function main() {
  if (!fs.existsSync(BUILD_INDEX)) {
    console.error("build/index.html not found — run `npm run build` first.");
    process.exit(1);
  }
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
  const browser = await chromium.launch({ executablePath });
  let blocking = 0;
  let reported = 0;

  for (const { name: width, viewport } of WIDTHS) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(`file://${BUILD_INDEX}`);
    for (const state of STATES) {
      const label = `${state.name} @ ${width}`;
      try {
        await state.setup(page);
        // Let CSS transitions finish, so colours are checked at rest rather
        // than mid-fade (e.g. a filter turning orange).
        await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== "running"));
        const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        const bad = violations.filter(v => BLOCKING.has(v.impact));
        const minor = violations.filter(v => !BLOCKING.has(v.impact));
        blocking += bad.length;
        reported += minor.length;
        if (bad.length) {
          console.error(`FAIL  ${label}`);
          bad.forEach(v => console.error(`      ${describe(v)}`));
        } else {
          console.log(`  ok  ${label}`);
        }
        minor.forEach(v => console.log(`      note ${describe(v)}`));
      } catch (err) {
        blocking++;
        console.error(`FAIL  ${label}\n      couldn't set up this state: ${err.message}`);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log(`\nAccessibility: ${blocking} serious/critical issue(s), ${reported} moderate/minor note(s) across ${STATES.length * WIDTHS.length} views.`);
  if (blocking) process.exit(1);
}

main();
