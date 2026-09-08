# My Recipes

A personal recipe collection built as a single self-contained HTML file. Recipes are stored as a JavaScript data array and rendered dynamically with ingredient tag filtering and time band filtering. No framework, no build step, no dependencies.

## Live site

Hosted on GitHub Pages at: `https://yourusername.github.io/my-recipes`

## How it works

All recipes live in the `recipes` array at the top of `index.html`. The page builds the filter UI and recipe cards automatically from that data. Adding a new recipe means adding a new object to the array — no other changes needed.

Each recipe object has the following shape:

```js
{
  id: "unique-slug",
  title: "Plain text title",
  titleHtml: "Title with <em>italic</em> styling",
  label: "Main course",
  servings: "4",
  time: "45 min",
  timeMins: 45,          // number — used for time band filtering
  extra: "180°C / fan 160°C",
  oven: true,            // shows "oven" label under temperature
  description: "One line description shown in the index.",
  tags: ["chicken", "potato"],  // ingredient tags for filtering
  ingredients: [
    { name: "Ingredient name", amount: "200g" },
  ],
  steps: [
    { title: "Step title", content: "Step instructions.", timer: "⏱ 20 minutes" },
  ],
  notes: "Extra tips shown at the bottom of the recipe.",
}
```

### Time bands

| Band | Range |
|------|-------|
| Under 30 min | `timeMins < 30` |
| 30–60 min | `timeMins >= 30 && timeMins <= 60` |
| Over 1 hr | `timeMins > 60` |

## Editing in Claude Code

Once you've cloned the repo, you can continue building the recipe collection with Claude Code. Here are some useful prompts to get started:

**Adding a new recipe**
> "Add a new recipe to index.html for [dish name]. Use the same data structure as the existing recipes in the array."

**Updating an existing recipe**
> "In index.html, update the [recipe id] recipe to change [what you want changed]."

**Fixing a bug**
> "There's a JavaScript syntax error in index.html. Check the recipes array for missing commas, brackets, or quotes and fix it."

**Checking for errors before pushing**
> "Extract the script from index.html, check it for syntax errors, and tell me what's wrong."

**Deploying after changes**
After editing locally, push to main and GitHub Pages will update within a couple of minutes:
```bash
git add index.html
git commit -m "Add [recipe name] recipe"
git push
```

## Project structure

```
my-recipes/
├── index.html   # Everything — recipes, styles, and logic in one file
├── README.md
├── .gitignore
└── LICENSE
```
