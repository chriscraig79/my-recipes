# My Recipes

A personal recipe collection. Recipe data is authored as one YAML file per
recipe; `src/index.html` is the hand-written page template (rendering
logic, styles, markup); a small build script compiles the two together
into `build/index.html`, which is what actually gets deployed. The shipped
site is still a single static HTML file with zero runtime dependencies —
the build step exists to keep the *source* easy to edit and review, and to
keep generated content out of git history, not to add any framework or
runtime machinery to the page itself.

## Live site

Hosted on GitHub Pages at: `https://chriscraig79.github.io/my-recipes`,
deployed automatically by GitHub Actions on every push to `main` (see
"Deploying" below) — there's nothing to run manually to publish a change.

## How it works

Each recipe is its own file at `recipes/<id>.yaml`. `recipes/_order.yaml`
lists every recipe id in the order they should appear on the index page.
`ingredients.yaml` is a shared registry mapping each canonical ingredient
name to the supermarket section it belongs to.

Running `npm run build` reads all of that plus `src/index.html` (the page
template) and compiles the result into `build/index.html` — the generated
block sits between `// GENERATED:RECIPES:START` / `// GENERATED:RECIPES:END`
markers in the template. **`build/` is gitignored and never committed** —
it only exists locally (for preview) and as CI's build output; the only
things ever committed are the YAML source and `src/index.html`.

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
image: dish-name.jpg  # optional — filename only, see "Photos" below
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

### Photos

`image` is optional. A recipe with no `image` field shows a tag-colored
monogram panel on its index card and no hero photo on its own page — that's
the default for every recipe today. To add a photo, save the file to
`recipes/images/<id>.<ext>` and set `image: <filename>` in the recipe's
YAML; `npm run build` (and `npm run watch`) copy `recipes/images/` into
`build/images/` automatically, so no other wiring is needed.

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
npm install                       # once, installs the js-yaml build dependency
npm run watch                     # rebuilds build/ automatically whenever
                                   # src/index.html, recipes/, or ingredients.yaml change
npx serve build
```

This opens the site at `http://localhost:3000`. `npm run watch` keeps
`build/` up to date as you edit, but there's still no browser auto-reload —
refresh the tab after each change to see it. (`npm run build` alone does a
single one-off build if you'd rather not run a background watcher.)

## Editing in Claude Code

Once you've cloned the repo, you can continue building the recipe collection with Claude Code. Here are some useful prompts to get started:

**Adding a new recipe**
> "Add a new recipe for [dish name]."

This is handled by the `add-recipe` skill (`.claude/skills/add-recipe/`), which knows the YAML schema, checks `ingredients.yaml` for existing ingredient names before inventing new ones, updates `recipes/_order.yaml`, and runs the build.

**Updating an existing recipe**
> "In recipes/[recipe id].yaml, update the recipe to change [what you want changed]." Rerun `npm run build` to preview it.

**Fixing a bug**
> "There's a YAML syntax error in recipes/[recipe id].yaml — find and fix it." or "The build script is failing, here's the error: [paste it]." or "Something's wrong with the page layout/styling — it's in src/index.html."

**Checking for errors before pushing**
> "Run `npm run build` and check the output for warnings or errors."

**Deploying after changes**
Just commit the YAML source (and `src/index.html`, if changed) and push to `main` — a GitHub Actions workflow (`.github/workflows/deploy.yml`) runs `npm run build` and publishes `build/` to GitHub Pages automatically. **Never commit anything under `build/`** — it's gitignored and CI produces it fresh on every push.
```bash
git add recipes/ ingredients.yaml src/index.html
git commit -m "Add [recipe name] recipe"
git push
```

## Project structure

```
my-recipes/
├── src/
│   └── index.html         # Hand-written template — markup, styles, rendering logic
├── build/                  # Gitignored — build output, what actually gets deployed
├── ingredients.yaml        # Canonical ingredient name -> shopping-list section
├── recipes/
│   ├── _order.yaml          # Index-page display order
│   ├── <id>.yaml            # One file per recipe (source of truth)
│   └── images/               # Optional recipe photos, <id>.<ext> — copied to build/images/
├── scripts/
│   ├── build.mjs             # Compiles src/ + recipes/*.yaml -> build/index.html
│   └── section-lookup.mjs    # Keyword-guess fallback used by build.mjs
├── .github/workflows/deploy.yml   # Builds and deploys to GitHub Pages on push to main
├── .claude/skills/add-recipe/     # Claude Code skill for adding recipes
├── package.json             # js-yaml build dependency
├── .gitignore
├── README.md
└── LICENSE
```
