import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import * as esbuild from "esbuild";
import { validateRecipes } from "./validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC_INDEX = path.join(ROOT, "src", "index.html");
const BUILD_DIR = path.join(ROOT, "build");
const BUILD_INDEX = path.join(BUILD_DIR, "index.html");
const START_MARKER = "// GENERATED:RECIPES:START";
const END_MARKER = "// GENERATED:RECIPES:END";
const SCALE_SRC = path.join(ROOT, "src", "scale.js");
const SCALE_INCLUDE = /^\/\/ INCLUDE:scale\.js.*$/m;

function loadIngredientRegistry() {
  const raw = yaml.load(fs.readFileSync(path.join(ROOT, "ingredients.yaml"), "utf8"));
  return new Map(Object.entries(raw).map(([name, entry]) => [name, entry.section]));
}

function loadRecipeFiles() {
  const dir = path.join(ROOT, "recipes");
  const order = yaml.load(fs.readFileSync(path.join(dir, "_order.yaml"), "utf8"));
  const files = new Map();
  for (const name of fs.readdirSync(dir).filter(f => f.endsWith(".yaml") && !f.startsWith("_")).sort()) {
    try {
      files.set(name.slice(0, -".yaml".length), yaml.load(fs.readFileSync(path.join(dir, name), "utf8")));
    } catch (err) {
      console.error(`\nrecipes/${name} isn't valid YAML:\n${err.message}\n`);
      process.exit(1);
    }
  }
  return { order, files };
}

function listImages() {
  const dir = path.join(ROOT, "recipes", "images");
  return new Set(fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => !f.startsWith(".")) : []);
}

// Every check lives in scripts/validate.mjs. Any failure stops the build
// with one line per problem, naming the file and field.
function validateOrExit({ order, files, registry }) {
  const errors = validateRecipes({ order, files, registry, images: listImages() });
  if (errors.length) {
    console.error(`\nRecipe data has ${errors.length} problem(s):\n` + errors.map(e => `  - ${e}`).join("\n") + "\n");
    process.exit(1);
  }
}

// Validation guarantees every ingredient is in the registry.
function resolveSections(recipes, registry) {
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) ing.section = registry.get(ing.name);
  }
}

function serializeRecipes(recipes) {
  // JSON.stringify already produces valid JS object/array literal syntax.
  // Compact, not pretty-printed — this block is generated and never
  // hand-read, and pretty-printing it was the single biggest contributor
  // to page weight (131KB of a 162KB page).
  return JSON.stringify(recipes);
}

function minifyHtml(html) {
  // Top-level function names (showIndex, toggleBasket, etc.) must survive —
  // the page calls them from inline onclick="..." attributes in the HTML,
  // which esbuild can't see. esbuild.transform (unbundled) already leaves
  // top-level identifiers alone for exactly this reason — verified this
  // holds before relying on it — so plain minify:true is safe here.
  const withStyle = html.replace(/<style>([\s\S]*?)<\/style>/, (_, css) => {
    const { code } = esbuild.transformSync(css, { loader: "css", minify: true });
    return `<style>${code.trim()}</style>`;
  });
  return withStyle.replace(/<script>([\s\S]*?)<\/script>/, (_, js) => {
    const { code } = esbuild.transformSync(js, { minify: true });
    return `<script>${code}</script>`;
  });
}

function copyImages() {
  const src = path.join(ROOT, "recipes", "images");
  if (!fs.existsSync(src)) return 0;
  const files = fs.readdirSync(src).filter(f => !f.startsWith("."));
  if (!files.length) return 0;
  const dest = path.join(BUILD_DIR, "images");
  fs.mkdirSync(dest, { recursive: true });
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
  return files.length;
}

function main() {
  const registry = loadIngredientRegistry();
  const { order, files } = loadRecipeFiles();
  validateOrExit({ order, files, registry });
  const recipes = order.map(id => files.get(id));
  resolveSections(recipes, registry);

  const html = fs.readFileSync(SRC_INDEX, "utf8");
  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Could not find ${START_MARKER} / ${END_MARKER} markers in src/index.html`);
  }

  const before = html.slice(0, startIdx + START_MARKER.length);
  const after = html.slice(endIdx);
  const generated = `\nconst recipes = ${serializeRecipes(recipes)};\n`;
  if (!SCALE_INCLUDE.test(after)) {
    throw new Error("Could not find the // INCLUDE:scale.js line in src/index.html");
  }
  // A function replacement, so `$` in the source is never read as a pattern.
  const withScale = after.replace(SCALE_INCLUDE, () => fs.readFileSync(SCALE_SRC, "utf8"));
  const assembled = before + generated + withScale;
  const minified = minifyHtml(assembled);

  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.writeFileSync(BUILD_INDEX, minified);
  const imageCount = copyImages();
  console.log(
    `Built build/index.html from ${recipes.length} recipes (${registry.size} known ingredients). ` +
    `${assembled.length} -> ${minified.length} bytes. ${imageCount} image(s) copied.`
  );
}

main();
