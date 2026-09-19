import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import * as esbuild from "esbuild";
import { guessSection } from "./section-lookup.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC_INDEX = path.join(ROOT, "src", "index.html");
const BUILD_DIR = path.join(ROOT, "build");
const BUILD_INDEX = path.join(BUILD_DIR, "index.html");
const START_MARKER = "// GENERATED:RECIPES:START";
const END_MARKER = "// GENERATED:RECIPES:END";

function loadIngredientRegistry() {
  const raw = yaml.load(fs.readFileSync(path.join(ROOT, "ingredients.yaml"), "utf8"));
  return new Map(Object.entries(raw).map(([name, entry]) => [name, entry.section]));
}

function loadRecipes() {
  const order = yaml.load(fs.readFileSync(path.join(ROOT, "recipes", "_order.yaml"), "utf8"));
  return order.map(id => {
    const file = path.join(ROOT, "recipes", `${id}.yaml`);
    if (!fs.existsSync(file)) {
      throw new Error(`recipes/_order.yaml lists "${id}" but recipes/${id}.yaml doesn't exist`);
    }
    return yaml.load(fs.readFileSync(file, "utf8"));
  });
}

function resolveSections(recipes, registry) {
  const missing = new Set();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      if (registry.has(ing.name)) {
        ing.section = registry.get(ing.name);
      } else {
        ing.section = guessSection(ing.name);
        missing.add(ing.name);
      }
    }
  }
  if (missing.size) {
    console.warn(
      `\nWarning: ${missing.size} ingredient(s) not found in ingredients.yaml ` +
      `(section guessed as a fallback — add them to the registry):\n` +
      [...missing].map(n => `  - ${n}`).join("\n") + "\n"
    );
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
  const recipes = loadRecipes();
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
  const assembled = before + generated + after;
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
