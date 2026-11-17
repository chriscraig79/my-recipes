---
name: recipe-illustration
description: Create a pencil-sketch and watercolour illustration of a dish for a recipe on this site (my-recipes), save it as recipes/images/<id>.webp and wire it into the recipe. Use whenever the user asks for an image, picture, illustration, drawing or artwork for a recipe, or to add one to a recipe that has none, even if they don't name the style.
---

# Recipe illustration

Every recipe image on this site is a hand-drawn-looking illustration in one
consistent style: **pencil sketch with watercolour washes**. It is drawn in
code (an SVG built by a small Python script), rendered to a WebP with
Playwright, and dropped into `recipes/images/`. No image generation or stock
photos: the drawing is made here, from shapes, so it stays on-style and
clearly reads as an illustration rather than a photo of the dish.

## The style

Hold to these. They are what the user approved, and the reasons matter when a
new dish needs something the helpers don't cover yet.

- **The food carries the detail; the background stays loose.** The dish gets
  texture, layered washes, pencil marks and garnish. The plate is a faint wash
  and a few broken pencil arcs. Nothing else in the scene: no napkins, cutlery
  or props, as they compete with the food at card size.
- **No black outlines.** Pencil is a warm mid-grey (`GRAPHITE`, `#7a6654`) at
  low opacity, drawn as broken segments with gaps. The watercolour defines the
  edges; the pencil only suggests them.
- **Hatching is irregular.** Short, slightly curved marks that vary in angle,
  length, spacing and weight, gathered where the shadow falls (light comes from
  the top left, so the right and the bottom are darker) and fading out in the
  light. Never even rows of parallel lines.
- **Watercolour, not flat fill.** Use `wash()` for areas (ragged edge, mottled
  pigment, a darker rim where it dries) and `blot()` for soft patches like
  browning, shadow and highlights. Let colour bleed slightly past the pencil.
- **Show what makes the dish itself.** Cut into it or arrange it so the
  defining ingredients are visible: potato layers in a tortilla, tangled
  spaghetti in a frittata. Read the recipe's ingredients and garnish before
  drawing, and include the garnish on top (herbs, diced tomato, cheese).
- **Palette:** warm paper (`#fbf7ee`) background; food in natural watercolour
  tones; a cool grey-violet (`#8d8aa3`) for cast shadow; greens around
  `#6f8f45` for herbs.
- **Seen from the front at about 30°**, centred.

## Canvas and crops

Draw on a 1600 × 1000 canvas. The site shows the same image two ways, so
keep the food roughly inside x 300–1300, y 250–850:

- **Index card:** cropped to 4:3 (`object-fit: cover`, centred), which keeps
  about x 133–1467 of the full width.
- **Recipe page:** the whole image, unframed, under the description and above
  the stats. Its paper tone is multiplied into the page and its edges fade out
  with a radial mask (`.recipe-hero img`), fully visible only inside about
  x 210–1390, y 160–920. That fade is why the background should stay pale and
  loose: whatever sits near the edges melts away.

## Workflow

1. **Read the recipe** (`recipes/<id>.yaml`): what the finished dish looks
   like, its key ingredients, and the garnish.
2. **Write a dish script** at `.claude/skills/recipe-illustration/dishes/<id>.py`.
   Start from the closest example in `dishes/`. Reuse the toolkit: draw any new
   kind of texture or shape in the dish script first, and only move it into
   `toolkit/sketchkit.py` once a second dish needs it. Give the `Sketch` a fixed
   `seed` so re-running reproduces the same image.
3. **Render** from the repo root:
   ```sh
   python3 .claude/skills/recipe-illustration/dishes/<id>.py /tmp/<id>.svg
   node .claude/skills/recipe-illustration/toolkit/render.mjs /tmp/<id>.svg recipes/images/<id>.webp /tmp/<id>-review.png
   ```
   This writes the WebP (aim for well under 100KB; WebP at quality 0.82 is
   usually 30–45KB) and a review sheet: the full image, the 4:3 card crop, and
   the recipe page version with its faded edges.
4. **Look at the review sheet** (open it with Read) and check:
   - the food has clearly more detail than the plate and background;
   - no outline looks black or continuous, and no hatching looks ruled;
   - the dish reads as that dish at card size (the defining ingredient shows);
   - nothing important is cut off on the card or faded away on the recipe page;
   - no hard-edged rectangles from a filter region clipping a soft wash (if you
     see one, enlarge that filter's `x/y/width/height`).
   Revise the script and re-render until it passes. Send the user the review
   sheet or a close-up, and ask for changes before wiring it in if they're
   watching.
5. **Wire it in:** set `image: <id>.webp` in `recipes/<id>.yaml` (filename
   only), run `npm run build`, and check it on the index card and recipe page.
   `npm test` must still pass.
6. **Commit** the WebP, the YAML change and the dish script. Don't commit the
   SVG or the review sheet: the script regenerates them.

## Toolkit reference (`toolkit/sketchkit.py`)

Python standard library only.

- `Sketch(seed)`: the SVG document, with the paper, graphite, wash and soft
  wash filters set up. `add(svg)`, `save(path)`, `clip(*paths)` … `end_clip()`.
- Watercolour: `wash(d, color, opacity)`, `blot(x, y, rx, ry, color, opacity)`,
  `soft_stroke(d, color, width, opacity)`.
- Pencil: `pencil(points, w, op, passes, j)` for a line through points,
  `broken(points, …)` for an outline in uneven segments, `mark(x, y, length,
  angle, op, w)` for one hatching stroke, `bubble(x, y, size)`, and
  `herb_fleck(x, y, color)`.
- Background: `plate()` draws the standard loose plate.
- `RoundDish(sk, cx, cy, rx, ry, h, a1, a2)`: a round, flat-topped dish with a
  wedge cut from the front, for tortillas, frittatas, quiches, cakes and tarts.
  Use `shadow()`, `paint(top, side, face, …)`, `outline()`, `side_hatching()`
  and `top_hatching()`. For your own detail use `top()`, `faces()` and
  `bands()` (paths to clip to), and `top_point(r, t)`, `random_top_point()`,
  `face_point(t, f, depth)` and `E(t, dy, k)` (points).

- `ShallowBowl(sk, …)`: a wide, shallow pasta-style bowl with a broad flat rim
  and a foot ring, for food served on a bed: curries and chilli on rice (and
  later, pasta and noodles). Place food in its well with `well_point(r, t)` or
  `random_well_point()`, and garnish the rim with `rim_point(t)`.
- `Bowl(sk, …)`: a deeper bowl for food that really is liquid, like soups and
  broths. It has a pale glaze and a soft blue-grey band, and a crescent of the
  inside wall shows at the back. Call `draw_back()` before the
  food and `draw_rim()` after it. Clip sauces to `surface()`, and place food
  with `surface_point(r, t)` or `random_surface_point()`. `rim_point(t)` puts
  garnish such as a lime wedge on the rim.

### Food pieces (`toolkit/foods.py`)

Reusable ingredients in the same style. Each takes the Sketch, then a position.
`curry_on_rice(sk, shallow_bowl, color, deep, light, rice=…)` draws the standard
curry plate: a bed of rice with a thick pool of curry in the middle. It returns
the pool, so `piled_points()` can heap chunks on it and `pool_point()` can
place garnish. `sauce(sk, bowl, color, deep, light)` fills a deep bowl with
soup or broth, `chunk()` draws pieces of
meat, potato or sweet potato sitting in sauce, and `rice_mound()` draws white
or (`dark=True`) black rice. For garnish there's `leaf()` (coriander, curry
leaf or mint), `chilli_ring()`, `swirl()` (cream or yoghurt), `peanut()`,
`sliver()` (flaked almonds), `lime_wedge()`, `dumpling()`, `oil_drizzle()`,
`bean()` and `strip()` (pepper or onion).

For a dish that fits neither shape (pasta on a plate, a roast joint, a stack
of pancakes, a sandwich), write the shape in the dish script with the same
pencil and wash helpers. Once it works, add it to the toolkit as a class
alongside `RoundDish` and `Bowl`, add any new ingredients to `foods.py`, and
add the dish to the examples below.

## Examples

- `dishes/spanish-tortilla.py`: a thick round dish with potato layers on the
  cut faces, bubbles and flecks on top, and parsley.
- `dishes/spaghetti-frittata.py`: a thinner round dish. Spaghetti strands swirl
  across the top in perspective and poke from the edge, the cut faces show
  tangled pasta, and the top is garnished with tomato, herbs and Parmesan.
- `dishes/chicken-coconut-curry.py` and the other curries: a `ShallowBowl`
  with a bed of rice and the curry ladled into the middle, its chunks heaped
  and garnish on top. Curries should never look like soup: thick sauce on
  rice, not a full bowl of liquid. `veggie-chilli.py` uses black rice and a
  yoghurt dollop.
- `dishes/coconut-curry-dumpling-soup.py`: the one real soup, so it uses the
  deep `Bowl`, full of broth with floating dumplings and chilli oil.

## Doing many recipes

Work in batches of one dish type at a time, so a shape and its ingredients
are built once and checked together. Put each batch on its own branch and PR,
and send the user a contact sheet of the batch (every image side by side,
labelled with the recipe id) plus a screenshot of the cards, before merging.

## Requirements

`python3` (no packages needed) and the repo's Playwright with Chromium
(`npm install`, then `npx playwright install chromium` if it isn't installed
yet).
