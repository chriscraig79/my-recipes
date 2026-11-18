---
name: add-recipe
description: Add a new recipe to this recipe site (my-recipes) — creates the recipes/<id>.yaml file, resolves ingredient names against the shared ingredients.yaml registry, updates recipes/_order.yaml, and runs the build. Use this whenever the user asks to add, create, or write up a new recipe for this project, wants an existing dish turned into a recipe entry, or pastes/describes a recipe (ingredients + method) and wants it added to the site — even if they don't say the word "skill" or name the file format.
---

# Add a recipe

This site compiles recipe data from YAML source files, plus the page
template at `src/index.html`, into `build/index.html` at build time (never
committed — GitHub Actions builds and deploys it fresh on every push to
`main`). Adding a recipe means writing one YAML file correctly — the
template and render code never need to change.

## Steps

1. **Pick an id.** A lowercase, hyphenated slug, e.g. `lemon-garlic-chicken`.
   Check `recipes/_order.yaml` to make sure it doesn't already exist.

2. **Write `recipes/<id>.yaml`.** Look at an existing file (e.g.
   `recipes/gratin.yaml`) for a concrete reference — matching its shape
   matters more than this list:

   - `id` — same slug as the filename
   - `title` — plain text
   - `titleHtml` — same as title, optionally with `<em>` around one word for
     styling (this site puts a little visual flourish on one word of most
     titles — look at a few existing recipes to get a feel for it, it's a
     nice-to-have, not a strict requirement)
   - `label` — the category shown on the index card. Reuse an existing one
     if it fits: `Main course`, `Side dish`, `Side / snack`, `Pasta`,
     `Light meal`, `Lunch`, `Breakfast / dessert`, `Breakfast / snack`. Only
     invent a new one if none of these genuinely fit.
   - `servings`
   - `time` — display string, e.g. `"45 min"`, `"1 hr 15 min"`
   - `timeMins` — a plain number in minutes. This drives the site's time
     filter (Under 30 / 30–60 / Over 1 hr), so it must match `time`.
   - `cookedIn` — how the dish is cooked, shown as the "Cooked in" stat.
     One of a fixed vocabulary: `Oven`, `Hob`, `Grill`, `Slow cooker`,
     `Air fryer`, `Pressure cooker`, `No cooking`. Pick whichever best
     describes the primary cooking method — don't invent a new value or a
     temperature/timing note; that level of detail belongs in the steps
     or `notes`, not this field.
   - `description` — one sentence, shown on the index card.
   - `tags` — strings that drive the index filter chips, of two kinds:
     - **Ingredients** — reuse existing tags where the dish genuinely
       contains that ingredient: `aubergine, bacon, beef, cabbage, carrot,
       chicken, chickpeas, cucumber, dumplings, eggs, lamb, mushroom,
       noodles, pasta, pork, potato, prawns, rice, salmon, seafood, spinach,
       vegetarian`.
     - **Dish type** — at least one, listed after the ingredient tags:
       `curry, stew, soup, roast, bake, fried, sticky, stir-fry, salad,
       omelette, pancakes, sandwich`. A pasta, noodle or rice dish can skip
       this when the carb tag already says what it is.
     Adding a new tag is fine if none fit, but map it to a group in
     `TAG_CATEGORIES` in `src/index.html` (or it lands under "Other") and
     mention that to the user rather than silently adding an orphaned tag.
   - `ingredients` — list of `{ name, amount, prep? }`. **Read the "Ingredient
     naming" section below before writing any of these** — it's the part
     most likely to go wrong.
   - `steps` — list of `{ title, content, timer? }`. `timer` is optional,
     free text like `"⏱ 20 minutes"`, only on steps with a real wait/cook time.
   - `notes` — one paragraph of tips, shown at the bottom of the recipe.
   - `image` — optional. If the user has a photo of the dish, save it to
     `recipes/images/<id>.<ext>` and set `image: <filename>` (filename
     only, not a path). Without it, the index card shows a tag-colored
     monogram panel and the recipe page shows no hero image — both are
     the normal, complete default, so never invent or fetch a photo just
     to fill this field.

3. **Add the id to `recipes/_order.yaml`.** This list controls the order
   recipes appear on the index page — insert the new id wherever feels
   right (many people add new recipes near the top or group by type; there's
   no enforced convention, use judgment or ask).

4. **Build for local preview.** `npm install` once if `node_modules` isn't
   there yet, then `npm run build`. This compiles every `recipes/*.yaml`
   file plus `ingredients.yaml` into `build/index.html` — gitignored,
   local-only, never committed. Deployment doesn't depend on this step:
   pushing to `main` triggers GitHub Actions to build and deploy fresh on
   its own.

   The build validates every recipe and stops with one line per problem
   (file + field) if anything is wrong — fix each one and rebuild. It
   rejects: a missing required field (every field above except `image`
   and per-step `timer`/ingredient `prep`); an `id` that doesn't match the
   filename; a recipe missing from `recipes/_order.yaml` (or an order entry
   with no file); a `cookedIn` outside the fixed list; a `timeMins` that
   isn't a positive number; an ingredient name not in `ingredients.yaml`;
   an `image` whose file isn't in `recipes/images/`; and any markup in
   `titleHtml` other than plain `<em>`/`<strong>`. All other text is shown
   exactly as written (it's escaped), so don't put HTML in it.

5. **Spot-check.** Serve locally (`npx serve build`) and look at the new
   recipe. If it shares an ingredient with another recipe, add both to the
   shopping basket and confirm they merge into one line on the shopping
   list — that's the payoff of getting the ingredient naming right.

6. **Commit the source only** (`recipes/<id>.yaml`, the updated
   `recipes/_order.yaml`, `ingredients.yaml` if you added an entry, and
   `recipes/images/<id>.<ext>` if a photo was added) — never anything
   under `build/`.

## Ingredient naming — the part that matters most

`ingredients.yaml` at the repo root is the canonical registry: it maps
every known ingredient name to the supermarket section it belongs to
(`Fruit & Veg`, `Meat & Fish`, `Deli & Dairy`, `Dry Goods & Spices`,
`Tinned & Jarred`, `Bread & Bakery`, `Other`). The shopping list merges
ingredients across recipes by an **exact match** on `name` — so if this
recipe's chicken stock is named slightly differently from every other
recipe's chicken stock, they'll show up as two separate lines instead of
merging into one. That's the whole reason this registry exists.

**Before writing an ingredient's `name`, check `ingredients.yaml` for an
existing entry that's the same ingredient**, and reuse its exact spelling —
don't invent a fresh one that's semantically identical but textually
different (`Chicken stock` vs `Chicken broth`, `Spring onion` vs `Spring
onions`).

This repo standardizes on the **plural form regardless of quantity** —
`Onions` even when the amount is `"1"`, `Garlic cloves` even when it's
`"1"`. This is a deliberate choice (favoring consistent merging over
grammatical agreement with the amount), not an oversight — don't
"correct" it back to singular for a quantity of one.

If the recipe genuinely needs an ingredient that isn't in the registry yet,
add it: open `ingredients.yaml` and add a new top-level entry with a
sensible `section`. The build **fails** on any ingredient name that isn't
in the registry (there's no guessing fallback), so a misspelt or new name
has to be fixed before the site will build.

**`prep` is separate from `name` on purpose.** `prep` holds how the
ingredient is prepared or a short variant note — `thinly sliced`, `melted`,
`for frying`, `or vegetable oil` — and is shown in smaller italic text under
the name on the recipe page, but it plays no part in shopping-list
merging. Put cutting/prep instructions and variant notes in `prep`, not
baked into `name` — that's what keeps "Carrots, thinly sliced" in one
recipe and "Carrots, diced" in another merging into a single "Carrots" line.

`name` should be **just the ingredient** — something another recipe could
reuse verbatim. Keep everything else out of it:

- **Size or count words go in `amount`**: `{ name: Eggs, amount: "3 large" }`,
  `{ name: Tomatoes, amount: "4 large" }`, `{ name: Eggs, amount: "2 yolks" }`,
  `{ name: Sourdough bread, amount: "6 thick slices" }` — not `Large eggs`,
  `Egg yolks`, `Thick slices sourdough bread`.
- **Alternatives go in `prep`**, with the first option as the `name`:
  `{ name: Parmesan, prep: or pecorino, grated }`,
  `{ name: Vegetable oil, prep: or sunflower oil }` — not
  `Parmesan or pecorino`.
- **Parenthetical notes go in `prep`**: `optional`, `for coating`,
  `from above`, `Maris Piper or King Edward` — not `Salt (for coating)`.
- **One ingredient per line**: split `Salt and black pepper` into separate
  `Salt` and `Black pepper` lines (`amount: to taste`).

```yaml
ingredients:
  - { name: Onions, amount: "1", prep: halved and thinly sliced }
  - { name: Garlic cloves, amount: "2", prep: minced }
  - { name: Butter, amount: "1 tbsp", prep: melted (or vegetable oil) }
  - { name: Eggs, amount: "2 large", prep: beaten }
  - { name: Plain flour, amount: "200g" }
```
