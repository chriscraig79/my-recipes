import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
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
  // JSON.stringify already produces valid JS object/array literal syntax;
  // pretty-print for readability, matching the file's existing indentation.
  return JSON.stringify(recipes, null, 2);
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

  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.writeFileSync(BUILD_INDEX, before + generated + after);
  console.log(`Built build/index.html from ${recipes.length} recipes (${registry.size} known ingredients).`);
}

main();
