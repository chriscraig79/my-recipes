import assert from "node:assert/strict";
import { validateRecipes } from "./validate.mjs";

// One small fixture per build rule in scripts/validate.mjs: start from a
// valid recipe, break one thing, and check the build would reject it with
// a message naming the file and the field.

const registry = new Map([["Onions", "Fruit & Veg"], ["Butter", "Deli & Dairy"]]);

function validRecipe(id = "test-dish") {
  return {
    id,
    title: "Test Dish",
    titleHtml: "Test <em>Dish</em>",
    label: "Main course",
    servings: "4",
    time: "30 min",
    timeMins: 30,
    cookedIn: "Hob",
    description: "A dish for tests.",
    tags: ["vegetarian"],
    ingredients: [{ name: "Onions", amount: "2", prep: "sliced" }, { name: "Butter", amount: "50g" }],
    steps: [{ title: "Cook", content: "Cook the onions in the butter.", timer: "⏱ 10 minutes" }],
    notes: "Some notes.",
  };
}

function run({ recipe = validRecipe(), id = recipe?.id ?? "test-dish", order = [id], images = new Set(), extraFiles = [] } = {}) {
  const files = new Map([[id, recipe], ...extraFiles]);
  return validateRecipes({ order, files, registry, images });
}

function expectError(name, input, pattern) {
  cases.push({ name, fn: () => {
    const errors = run(input);
    assert.ok(errors.some(e => pattern.test(e)), `expected an error matching ${pattern}, got:\n  ${errors.join("\n  ") || "(none)"}`);
  } });
}

const cases = [];
const without = field => { const r = validRecipe(); delete r[field]; return r; };
const withField = (field, value) => ({ ...validRecipe(), [field]: value });

cases.push({ name: "a valid recipe passes", fn: () => assert.deepEqual(run(), []) });

for (const field of ["id", "title", "servings", "time", "timeMins", "cookedIn", "ingredients", "steps"]) {
  expectError(`missing \`${field}\` is rejected`, { recipe: without(field), id: "test-dish" },
    new RegExp(`recipes/test-dish\\.yaml: missing required field \`${field}\``));
}

expectError("id not matching its filename is rejected", { recipe: withField("id", "other-dish"), id: "test-dish" },
  /recipes\/test-dish\.yaml: `id` is "other-dish" but the filename is test-dish\.yaml/);
expectError("recipe file missing from _order.yaml is rejected", { order: [] },
  /recipes\/test-dish\.yaml: not listed in recipes\/_order\.yaml/);
expectError("_order.yaml entry without a file is rejected", { order: ["test-dish", "ghost"] },
  /recipes\/_order\.yaml: lists "ghost" but recipes\/ghost\.yaml doesn't exist/);
expectError("duplicate _order.yaml entry is rejected", { order: ["test-dish", "test-dish"] },
  /recipes\/_order\.yaml: "test-dish" is listed more than once/);
expectError("unknown cookedIn is rejected", { recipe: withField("cookedIn", "Microwave") },
  /`cookedIn` is "Microwave"; must be one of/);
expectError("timeMins of zero is rejected", { recipe: withField("timeMins", 0) }, /`timeMins` must be a positive number/);
expectError("timeMins as text is rejected", { recipe: withField("timeMins", "45") }, /`timeMins` must be a positive number/);
expectError("ingredient not in ingredients.yaml is rejected",
  { recipe: { ...validRecipe(), ingredients: [{ name: "Onion", amount: "1" }] } },
  /ingredients\[0\] "Onion" isn't in ingredients\.yaml/);
expectError("image that doesn't exist is rejected", { recipe: withField("image", "test-dish.webp") },
  /`image` is "test-dish\.webp" but recipes\/images\/test-dish\.webp doesn't exist/);
cases.push({ name: "image that exists passes", fn: () =>
  assert.deepEqual(run({ recipe: withField("image", "test-dish.webp"), images: new Set(["test-dish.webp"]) }), []) });
expectError("image with a path or markup is rejected", { recipe: withField("image", '../x.webp" onerror="alert(1)'), images: new Set() },
  /`image` must be a plain filename/);
expectError("<script> in titleHtml is rejected", { recipe: withField("titleHtml", "Test <script>alert(1)</script>") },
  /`titleHtml` may only use <em>, <strong> — found <script> <\/script>/);
expectError("onerror attribute in titleHtml is rejected", { recipe: withField("titleHtml", 'Test <img src=x onerror="alert(1)">') },
  /`titleHtml` may only use .* found <img/);
expectError("attributes on an allowed tag are rejected", { recipe: withField("titleHtml", 'Test <em onclick="x()">Dish</em>') },
  /`titleHtml` may only use .* found <em onclick/);
cases.push({ name: "<strong> in titleHtml passes", fn: () =>
  assert.deepEqual(run({ recipe: withField("titleHtml", "Test <strong>Dish</strong>") }), []) });
expectError("servings that aren't a number are rejected", { recipe: withField("servings", "a crowd") },
  /`servings` is "a crowd"; must be a whole number/);
expectError("servings of zero are rejected", { recipe: withField("servings", "0") }, /`servings` is "0"/);
cases.push({ name: "a servings range passes", fn: () => assert.deepEqual(run({ recipe: withField("servings", "3–4") }), []) });
expectError("empty steps list is rejected", { recipe: withField("steps", []) }, /`steps` must be a non-empty list/);
expectError("step without content is rejected", { recipe: withField("steps", [{ title: "Cook" }]) }, /steps\[0\] is missing `content`/);

let failed = 0;
for (const { name, fn } of cases) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${name}\n      ${err.message}`);
  }
}
console.log(`\n${cases.length - failed}/${cases.length} validation checks passed.\n`);
if (failed) process.exit(1);
