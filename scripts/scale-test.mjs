import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

// Unit tests for src/scale.js, the servings scaler. That file is plain
// browser script (build.mjs inlines it into the page), so load it into a
// fresh context here rather than importing it.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(__dirname, "..", "src", "scale.js"), "utf8");
const context = {};
vm.runInNewContext(`${source}\n;globalThis.api = { scaleAmount, parseServings };`, context);
const { scaleAmount, parseServings } = context.api;

const cases = [
  // [amount, factor, expected]
  // Unchanged at the recipe's own servings, and when there's no number.
  ["135g", 1, "135g"],
  ["to taste", 2, "to taste"],
  ["a squeeze", 3, "a squeeze"],
  ["as needed", 0.5, "as needed"],
  [undefined, 2, undefined],

  // Metric weights and volumes, rounded to sensible steps.
  ["135g", 2, "270g"],
  ["130ml", 1.5, "200ml"],
  ["40g", 0.5, "20g"],
  ["5g", 0.25, "1g"],
  ["600g", 2, "1.2kg"],
  ["1½kg", 0.5, "750g"],
  ["2.4kg", 2, "4.8kg"],
  ["750ml", 2, "1.5 litres"],
  ["500ml", 2, "1 litre"],
  ["5cm", 2, "10cm"],

  // Spoons and cups as kitchen fractions, switching tsp/tbsp where neater.
  ["1 tsp", 2, "2 tsp"],
  ["½ tsp", 0.5, "¼ tsp"],
  ["1½ tsp", 2, "1 tbsp"],
  ["1 tbsp", 0.5, "1½ tsp"],
  ["2 tbsp", 1.5, "3 tbsp"],
  ["1½ tbsp", 2, "3 tbsp"],
  ["⅓ cup", 2, "⅔ cup"],
  ["½ cup", 3, "1½ cups"],
  ["8 oz", 0.5, "4 oz"],
  ["1 heaped tbsp", 2, "2 heaped tbsp"],

  // Counts keep their words, and count words agree with the new number.
  ["2 large", 2, "4 large"],
  ["1 large", 0.5, "½ large"],
  ["½ medium", 2, "1 medium"],
  ["6 thick slices", 0.5, "3 thick slices"],
  ["1 yolk", 2, "2 yolks"],
  ["2 yolks", 0.5, "1 yolk"],
  ["1 small bunch", 2, "2 small bunches"],
  ["1 thumb-sized piece", 2, "2 thumb-sized pieces"],
  ["4 leaves", 0.25, "1 leaf"],
  ["1 pinch", 2, "2 pinches"],
  ["½", 2, "1"],
  ["4", 1.5, "6"],
  ["12", 0.5, "6"],

  // Ranges scale both ends, and collapse if they round to the same value.
  ["400–500ml", 2, "800ml–1 litre"],
  ["30–40g", 2, "60–80g"],
  ["1–2 tbsp", 2, "2–4 tbsp"],
  ["3–4 slices", 2, "6–8 slices"],
  ["3–4", 0.25, "¾–1"],
  ["30–32g", 0.25, "8g"],

  // Multipliers scale the count, not the pack size.
  ["2 x 400g", 2, "4 x 400g"],
  ["1 x 400g", 1.5, "1½ x 400g"],

  // Tins become more tins, not bigger ones.
  ["400g tin", 2, "2 x 400g tins"],
  ["400g tin", 0.5, "½ x 400g tin"],

  // Parentheticals: both numbers scale, unless it's per item.
  ["600g (4 breasts)", 0.5, "300g (2 breasts)"],
  ["400ml (1 tin)", 2, "800ml (2 tins)"],
  ["1 bunch (30g)", 2, "2 bunches (60g)"],
  ["2 (about 450g)", 2, "4 (about 900g)"],
  ["2 (250g each)", 2, "4 (250g each)"],
];

const failures = [];
for (const [amount, factor, expected] of cases) {
  const actual = scaleAmount(amount, factor);
  if (actual !== expected) failures.push(`scaleAmount(${JSON.stringify(amount)}, ${factor}) = ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

const servingsCases = [
  ["4", { lo: 4, hi: 4, base: 4 }],
  ["3–4", { lo: 3, hi: 4, base: 3.5 }],
  ["2-3", { lo: 2, hi: 3, base: 2.5 }],
  ["0", null],
  ["a crowd", null],
  ["4–3", null],
];
for (const [text, expected] of servingsCases) {
  try {
    assert.deepEqual(JSON.parse(JSON.stringify(parseServings(text))), expected);
  } catch {
    failures.push(`parseServings(${JSON.stringify(text)}) = ${JSON.stringify(parseServings(text))}, expected ${JSON.stringify(expected)}`);
  }
}

const total = cases.length + servingsCases.length;
if (failures.length) {
  console.error(failures.map(f => `FAIL  ${f}`).join("\n"));
  console.error(`\n${total - failures.length}/${total} scaling checks passed.`);
  process.exit(1);
}
console.log(`${total}/${total} scaling checks passed.`);
