// ─────────────────────────────────────────────
//  SERVINGS SCALING
// ─────────────────────────────────────────────
//
// Rescales free-text ingredient amounts ("135g", "1½ tbsp", "2 large",
// "2 x 400g", "400g tin", "to taste") when the reader changes the number of
// servings. build.mjs inlines this file into the page's script where
// src/index.html has the `// INCLUDE:scale.js` line, and
// scripts/scale-test.mjs loads it directly to unit-test it, so it has to
// stay plain browser JavaScript: function declarations, no imports.
//
// Amounts with no number in them ("to taste", "a squeeze") never change.
// Method steps opt in per amount with {{ }} markers; see splitScaleMarkers.

const SCALE_FRACTION_GLYPHS = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4 };
const SCALE_NICE_FRACTIONS = [[0, ''], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, '']];
const SCALE_NUM = '(?:\\d+\\/\\d+|\\d+(?:\\.\\d+)?[½⅓⅔¼¾]?|[½⅓⅔¼¾])';
const SCALE_UNITS = 'kg|g|ml|litres?|l|tsp|tbsp|cups?|oz|cm';
const SCALE_QTY_RE = new RegExp(`(${SCALE_NUM})(?:\\s*[–-]\\s*(${SCALE_NUM}))?(?:\\s*(${SCALE_UNITS})(?![a-z]))?`, 'gi');

// Count words that take a plural after a number above one: "1 tin" / "2 tins".
const SCALE_NOUNS = {
  breast: 'breasts', bunch: 'bunches', clove: 'cloves', egg: 'eggs', handful: 'handfuls',
  head: 'heads', leaf: 'leaves', piece: 'pieces', pinch: 'pinches', slice: 'slices',
  tin: 'tins', yolk: 'yolks'
};
const SCALE_SINGULARS = Object.fromEntries(Object.entries(SCALE_NOUNS).map(([one, many]) => [many, one]));

// "4" -> { lo: 4, hi: 4, base: 4 }; "3–4" -> { lo: 3, hi: 4, base: 3.5 }.
// Anything else -> null (the page then shows servings as plain text).
function parseServings(text) {
  const m = /^\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*$/.exec(String(text ?? ''));
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : lo;
  if (lo < 1 || hi < lo) return null;
  return { lo, hi, base: (lo + hi) / 2 };
}

function parseScaleNumber(text) {
  if (text.includes('/')) {
    const [a, b] = text.split('/').map(Number);
    return a / b;
  }
  const glyph = text.slice(-1);
  if (glyph in SCALE_FRACTION_GLYPHS) {
    const whole = text.slice(0, -1);
    return (whole ? Number(whole) : 0) + SCALE_FRACTION_GLYPHS[glyph];
  }
  return Number(text);
}

// Nearest kitchen fraction: 1¼, ⅓, 2½... Whole numbers from 10 up, and
// never rounded down to nothing.
function formatFraction(value, smallest = 1 / 4) {
  if (value >= 10) return String(Math.round(value));
  let whole = Math.floor(value);
  let best = SCALE_NICE_FRACTIONS[0];
  for (const f of SCALE_NICE_FRACTIONS) {
    if (Math.abs(value - whole - f[0]) < Math.abs(value - whole - best[0])) best = f;
  }
  if (best[0] === 1) { whole += 1; best = SCALE_NICE_FRACTIONS[0]; }
  if (whole === 0 && best[0] < smallest) {
    best = SCALE_NICE_FRACTIONS.find(f => f[0] >= smallest);
  }
  if (whole === 0) return best[1];
  return `${whole}${best[1]}`;
}

// Counts ("2 large", "6 thick slices"): halves below 5, whole numbers above.
function formatCount(value) {
  if (value >= 5) return String(Math.max(1, Math.round(value)));
  if (value >= 1) {
    const halves = Math.round(value * 2) / 2;
    return formatFraction(halves);
  }
  return formatFraction(value);
}

function roundMetric(value) {
  const step = value < 10 ? 1 : value < 100 ? 5 : value < 500 ? 10 : 25;
  return Math.max(1, Math.round(value / step) * step);
}

function trimDecimal(value) {
  return String(Math.round(value * 10) / 10);
}

// Formats one scaled quantity in its unit. `unit` is lower case or ''.
// Returns [number text, unit text] so a range can share one unit.
function formatQuantity(value, unit) {
  switch (unit) {
    case 'g':
    case 'kg': {
      const grams = unit === 'kg' ? value * 1000 : value;
      return grams >= 1000 ? [trimDecimal(grams / 1000), 'kg'] : [String(roundMetric(grams)), 'g'];
    }
    case 'ml':
    case 'l':
    case 'litre':
    case 'litres': {
      const ml = unit === 'ml' ? value : value * 1000;
      if (ml < 1000) return [String(roundMetric(ml)), 'ml'];
      const litres = trimDecimal(ml / 1000);
      return [litres, litres === '1' ? ' litre' : ' litres'];
    }
    case 'tsp':
    case 'tbsp': {
      const tsp = unit === 'tbsp' ? value * 3 : value;
      // Whole or half tablespoons read better than a pile of teaspoons,
      // and under a tablespoon reads better in teaspoons.
      if (tsp >= 3 && Math.abs(tsp / 1.5 - Math.round(tsp / 1.5)) < 0.01) return [formatFraction(tsp / 3), ' tbsp'];
      if (unit === 'tbsp' && value >= 1) return [formatFraction(value), ' tbsp'];
      return [formatFraction(tsp), ' tsp'];
    }
    case 'cup':
    case 'cups':
      return [formatFraction(value), value > 1 ? ' cups' : ' cup'];
    case 'oz':
      return [formatFraction(value), ' oz'];
    case 'cm':
      return [String(Math.max(1, Math.round(value))), 'cm'];
    default:
      return [formatCount(value), ''];
  }
}

// "1 small bunch" -> "2 small bunches": fixes the first count word in the
// next few words to agree with the new number.
function agreeNoun(after, plural) {
  const m = /^((?:\s+[a-z-]+){1,3})/i.exec(after);
  if (!m) return after;
  const words = m[1].split(/(\s+)/);
  for (let i = 0; i < words.length; i++) {
    const lower = words[i].toLowerCase();
    if (plural && SCALE_NOUNS[lower]) { words[i] = SCALE_NOUNS[lower]; break; }
    if (!plural && SCALE_SINGULARS[lower]) { words[i] = SCALE_SINGULARS[lower]; break; }
    if (SCALE_NOUNS[lower] || SCALE_SINGULARS[lower]) break;
  }
  return words.join('') + after.slice(m[1].length);
}

function scaleQuantities(text, factor) {
  let out = '';
  let last = 0;
  SCALE_QTY_RE.lastIndex = 0;
  let m;
  while ((m = SCALE_QTY_RE.exec(text))) {
    const [match, a, b, rawUnit] = m;
    const unit = (rawUnit || '').toLowerCase();
    const lo = parseScaleNumber(a) * factor;
    const hi = b ? parseScaleNumber(b) * factor : lo;
    const [loText, loUnit] = formatQuantity(lo, unit);
    const [hiText, hiUnit] = formatQuantity(hi, unit);
    let scaled;
    if (!b || (loText === hiText && loUnit === hiUnit)) scaled = hiText + hiUnit;
    else if (loUnit === hiUnit) scaled = `${loText}–${hiText}${hiUnit}`;
    else scaled = `${loText}${loUnit}–${hiText}${hiUnit}`;
    out += text.slice(last, m.index) + scaled;
    last = m.index + match.length;
    if (!unit) {
      const rest = agreeNoun(text.slice(last), hi > 1);
      text = text.slice(0, last) + rest;
    }
    SCALE_QTY_RE.lastIndex = last;
  }
  return out + text.slice(last);
}

// Scales one ingredient amount by `factor` (new servings / recipe servings).
function scaleAmount(amount, factor) {
  if (!amount || factor === 1 || !/\d|[½⅓⅔¼¾]/.test(amount)) return amount;
  const text = String(amount);

  // "400g tin" -> "2 x 400g tins": more tins, not a bigger tin.
  const tin = new RegExp(`^(${SCALE_NUM}\\s*(?:g|ml))\\s+(tins?|cans?|jars?)$`, 'i').exec(text);
  if (tin) {
    const count = formatCount(factor);
    const plural = factor > 1;
    const noun = tin[2].replace(/s$/i, '') + (plural ? 's' : '');
    return `${count} x ${tin[1]} ${noun}`;
  }

  // "2 x 400g": scale the count, not the pack size.
  const multi = new RegExp(`^(${SCALE_NUM})(\\s*[x×]\\s*)(.+)$`, 'i').exec(text);
  if (multi) return formatCount(parseScaleNumber(multi[1]) * factor) + multi[2] + multi[3];

  // "2 (250g each)": the part that's per item stays as it is.
  return text
    .split(/(\([^)]*\beach\b[^)]*\))/i)
    .map((part, i) => (i % 2 ? part : scaleQuantities(part, factor)))
    .join('');
}

// Method steps mark the amounts that scale with servings in double braces:
// "Add {{250ml}} water". Returns the text in parts, with `amount` set on
// the marked ones, so the page can wrap them and rescale them later.
// Anything else in a step (times, temperatures, dish sizes) stays as written.
function splitScaleMarkers(text) {
  const parts = [];
  const re = /\{\{([^{}]+)\}\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[1], amount: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
