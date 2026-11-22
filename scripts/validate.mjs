// Recipe data checks run by `npm run build`. Every problem found is
// reported (file + field + what's wrong) and the build fails, so a typo or
// missing field never reaches the site as a blank or broken page.
//
// Pure function over already-parsed data, so scripts/validate-test.mjs can
// feed it small in-memory fixtures without touching the real recipes.

export const COOKED_IN = ["Oven", "Hob", "Grill", "Slow cooker", "Air fryer", "Pressure cooker", "No cooking"];

// Fields the page renders unconditionally — a missing one would show up as
// "undefined" or break rendering.
export const REQUIRED_FIELDS = [
  "id", "title", "titleHtml", "label", "servings", "time", "timeMins",
  "cookedIn", "description", "tags", "ingredients", "steps", "notes",
];

const STRING_FIELDS = ["title", "titleHtml", "label", "time", "description", "notes"];

// The only markup allowed anywhere in recipe data, and only in `titleHtml`.
// Everything else is escaped when the page renders it.
export const ALLOWED_TITLE_TAGS = ["em", "strong"];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_NAME = /^[a-z0-9][a-z0-9._-]*\.(?:webp|jpe?g|png|avif)$/i;

const isText = v => typeof v === "string" && v.trim() !== "";

// Returns the disallowed tags in a titleHtml string (empty if it's fine).
export function disallowedTitleTags(html) {
  const tags = html.match(/<[^>]*>?/g) || [];
  const ok = new RegExp(`^</?(?:${ALLOWED_TITLE_TAGS.join("|")})>$`);
  return tags.filter(t => !ok.test(t));
}

/**
 * @param {object} input
 * @param {string[]} input.order          ids from recipes/_order.yaml
 * @param {Map<string, any>} input.files  recipe file id (filename without .yaml) -> parsed YAML
 * @param {Map<string, string>} input.registry  ingredient name -> section
 * @param {Set<string>} input.images      filenames present in recipes/images/
 * @returns {string[]} error messages; empty means valid
 */
export function validateRecipes({ order, files, registry, images }) {
  const errors = [];

  if (!Array.isArray(order)) {
    return ["recipes/_order.yaml: expected a list of recipe ids"];
  }
  const seen = new Set();
  for (const id of order) {
    if (seen.has(id)) errors.push(`recipes/_order.yaml: "${id}" is listed more than once`);
    seen.add(id);
    if (!files.has(id)) errors.push(`recipes/_order.yaml: lists "${id}" but recipes/${id}.yaml doesn't exist`);
  }
  for (const id of files.keys()) {
    if (!seen.has(id)) errors.push(`recipes/${id}.yaml: not listed in recipes/_order.yaml`);
  }

  for (const [fileId, r] of files) {
    const file = `recipes/${fileId}.yaml`;
    const err = msg => errors.push(`${file}: ${msg}`);

    if (!r || typeof r !== "object" || Array.isArray(r)) {
      err("expected a mapping of recipe fields");
      continue;
    }

    for (const field of REQUIRED_FIELDS) {
      if (r[field] === undefined || r[field] === null || r[field] === "") err(`missing required field \`${field}\``);
    }

    if (r.id !== undefined && r.id !== fileId) err(`\`id\` is "${r.id}" but the filename is ${fileId}.yaml — they must match`);
    if (!SLUG.test(fileId)) err(`filename must be a lowercase hyphenated slug (e.g. lemon-garlic-chicken.yaml)`);

    for (const field of STRING_FIELDS) {
      if (r[field] !== undefined && r[field] !== null && typeof r[field] !== "string") err(`\`${field}\` must be text`);
    }
    if (r.servings !== undefined) {
      // Same shape the page's servings stepper reads (parseServings in
      // src/scale.js): a whole number, or a range like "3–4".
      const m = /^\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*$/.exec(String(r.servings));
      if (!["string", "number"].includes(typeof r.servings) || !m || Number(m[1]) < 1 || (m[2] && Number(m[2]) < Number(m[1]))) {
        err(`\`servings\` is ${JSON.stringify(r.servings)}; must be a whole number like "4" or a range like "3–4"`);
      }
    }

    if (r.timeMins !== undefined && !(typeof r.timeMins === "number" && Number.isFinite(r.timeMins) && r.timeMins > 0)) {
      err(`\`timeMins\` must be a positive number of minutes, got ${JSON.stringify(r.timeMins)}`);
    }

    if (r.cookedIn !== undefined && !COOKED_IN.includes(r.cookedIn)) {
      err(`\`cookedIn\` is ${JSON.stringify(r.cookedIn)}; must be one of: ${COOKED_IN.join(", ")}`);
    }

    if (typeof r.titleHtml === "string") {
      const bad = disallowedTitleTags(r.titleHtml);
      if (bad.length) err(`\`titleHtml\` may only use <${ALLOWED_TITLE_TAGS.join(">, <")}> — found ${bad.join(" ")}`);
    }

    if (r.tags !== undefined) {
      if (!Array.isArray(r.tags) || !r.tags.every(isText)) err("`tags` must be a list of words");
    }

    if (r.ingredients !== undefined) {
      if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) {
        err("`ingredients` must be a non-empty list");
      } else {
        r.ingredients.forEach((ing, i) => {
          const where = `ingredients[${i}]`;
          if (!ing || typeof ing !== "object") return err(`${where} must be { name, amount, prep? }`);
          if (!isText(ing.name)) return err(`${where} is missing \`name\``);
          if (!registry.has(ing.name)) {
            err(`${where} "${ing.name}" isn't in ingredients.yaml — reuse an existing name or add it there with a section`);
          }
          if (ing.amount !== undefined && !["string", "number"].includes(typeof ing.amount)) err(`${where}.amount must be text`);
          if (ing.prep !== undefined && typeof ing.prep !== "string") err(`${where}.prep must be text`);
        });
      }
    }

    if (r.steps !== undefined) {
      if (!Array.isArray(r.steps) || r.steps.length === 0) {
        err("`steps` must be a non-empty list");
      } else {
        r.steps.forEach((step, i) => {
          const where = `steps[${i}]`;
          if (!step || typeof step !== "object") return err(`${where} must be { title, content, timer? }`);
          if (!isText(step.title)) err(`${where} is missing \`title\``);
          if (!isText(step.content)) err(`${where} is missing \`content\``);
          if (step.timer !== undefined && typeof step.timer !== "string") err(`${where}.timer must be text`);
        });
      }
    }

    if (r.image !== undefined) {
      if (typeof r.image !== "string" || !IMAGE_NAME.test(r.image)) {
        err(`\`image\` must be a plain filename like ${fileId}.webp, got ${JSON.stringify(r.image)}`);
      } else if (!images.has(r.image)) {
        err(`\`image\` is "${r.image}" but recipes/images/${r.image} doesn't exist`);
      }
    }
  }

  return errors;
}
