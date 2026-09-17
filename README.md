# My Recipes

A personal recipe collection. Recipe data is authored as one YAML file per
recipe and compiled by a small local build script into `index.html`, which
renders everything dynamically with ingredient tag filtering and time band
filtering. The shipped site is still a single static HTML file with zero
runtime dependencies — the build step only exists to keep the *source* data
easy to edit and review; nothing changes about how the site loads or runs.

## Live site

Hosted on GitHub Pages at: `https://chriscraig79.github.io/my-recipes`

## How it works

Each recipe is its own file at `recipes/<id>.yaml`. `recipes/_order.yaml`
lists every recipe id in the order they should appear on the index page.
`ingredients.yaml` is a shared registry mapping each canonical ingredient
name to the supermarket section it belongs to.

Running `npm run build` reads all of that and compiles it into the
generated block inside `index.html` (between the
`// GENERATED:RECIPES:START` / `// GENERATED:RECIPES:END` markers), which
is what the page actually renders from at runtime. **That generated block
should never be hand-edited** — edit the YAML source and rebuild instead;
see "Local development" below.

Each recipe file has this shape:

```yaml
id: unique-slug
title: Plain text title
titleHtml: Title with <em>italic</em> styling
label: Main course
servings: "4"
time: 45 min
timeMins: 45          # number — used for time band filtering
extra: 180°C / fan 160°C
oven: true             # shows "oven" label under temperature
description: One line description shown in the index.
tags: [chicken, potato]     # ingredient tags for filtering
ingredients:
  - { name: Ingredient name, amount: 200g }
  # `prep` is optional — shown on the recipe page as "Carrots, thinly
  # sliced", but the shopping list only groups/merges on `name`, so
  # keeping prep separate lets "Carrots" from different recipes merge
  # into one line. See "Ingredient names" below.
  - { name: Carrots, amount: 300g, prep: thinly sliced }
steps:
  - { title: Step title, content: Step instructions., timer: "⏱ 20 minutes" }
notes: Extra tips shown at the bottom of the recipe.
```

### Ingredient names

`ingredients.yaml` is the single source of truth for which supermarket
section an ingredient belongs to — there's no more per-recipe `section`
override. Before adding an ingredient, check `ingredients.yaml` for an
existing entry with the same name and reuse its exact spelling; the
shopping list merges ingredients across recipes by an **exact match on
`name`**, so a new spelling of an existing ingredient creates a second,
unmerged line instead of joining the first.

Names are standardized to the **plural form regardless of quantity**
(`Onions` even when the amount is `1`, `Garlic cloves` even when it's `1`)
— a deliberate choice favoring consistent merging over grammatical
agreement with the amount.

If a recipe needs a genuinely new ingredient, add it to `ingredients.yaml`
with a section. The build has a keyword-guessing fallback for anything
missing from the registry (and prints a warning when it kicks in), but
that's a safety net, not a substitute for a real entry.

### Time bands

| Band | Range |
|------|-------|
| Under 30 min | `timeMins < 30` |
| 30–60 min | `timeMins >= 30 && timeMins <= 60` |
| Over 1 hr | `timeMins > 60` |

## Shopping list

Any recipe can be added to a shopping basket — via the "+" button on its index card or "Add to shopping list" on its own page. The basket is saved to `localStorage`, so it survives a reload, and a "🛒 Shopping list (N)" badge (bottom-right) links to the shopping list view.

The shopping list groups every basket recipe's ingredients into supermarket sections, in walking order:

Fruit & Veg → Meat & Fish → Deli & Dairy → Dry Goods & Spices → Tinned & Jarred → Bread & Bakery → Other

Each ingredient's section comes from `ingredients.yaml`, resolved at build
time — see "Ingredient names" above.

Ingredients with the same `name` are merged into a single line across recipes, listing every recipe it came from (no unit math or amounts shown — just the name and its source recipes). Since `name` excludes prep notes (see `prep` above), "Carrots, thinly sliced" in one recipe and "Carrots, chopped" in another merge into one "Carrots" line — the prep text still shows on each recipe's own page, just not on the shopping list. A "Send to WhatsApp" button opens `wa.me` with the list pre-filled, ready to pick a chat and send.

## Local development

```bash
npm install       # once, installs the js-yaml build dependency
npm run build      # compiles recipes/*.yaml + ingredients.yaml into index.html
npx serve .
```

This opens the site at `http://localhost:3000`. There's no auto-reload for
either step — after editing a recipe, rerun `npm run build`, then refresh
the browser tab.

## Editing in Claude Code

Once you've cloned the repo, you can continue building the recipe collection with Claude Code. Here are some useful prompts to get started:

**Adding a new recipe**
> "Add a new recipe for [dish name]."

This is handled by the `add-recipe` skill (`.claude/skills/add-recipe/`), which knows the YAML schema, checks `ingredients.yaml` for existing ingredient names before inventing new ones, updates `recipes/_order.yaml`, and runs the build.

**Updating an existing recipe**
> "In recipes/[recipe id].yaml, update the recipe to change [what you want changed]." Rerun `npm run build` afterward.

**Fixing a bug**
> "There's a YAML syntax error in recipes/[recipe id].yaml — find and fix it." or "The build script is failing, here's the error: [paste it]."

**Checking for errors before pushing**
> "Run `npm run build` and check the output for warnings or errors."

**Deploying after changes**
After editing locally, rebuild, commit the YAML source *and* the regenerated `index.html`, then push to main — GitHub Pages will update within a couple of minutes:
```bash
npm run build
git add index.html recipes/ ingredients.yaml
git commit -m "Add [recipe name] recipe"
git push
```

## Project structure

```
my-recipes/
├── index.html          # Compiled output — rendering logic + generated recipe data
├── ingredients.yaml     # Canonical ingredient name -> shopping-list section
├── recipes/
│   ├── _order.yaml       # Index-page display order
│   └── <id>.yaml         # One file per recipe (source of truth)
├── scripts/
│   ├── build.mjs          # Compiles recipes/*.yaml -> index.html
│   └── section-lookup.mjs # Keyword-guess fallback used by build.mjs
├── .claude/skills/add-recipe/   # Claude Code skill for adding recipes
├── package.json          # js-yaml build dependency
├── .gitignore
├── README.md
└── LICENSE
```
