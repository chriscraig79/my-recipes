// Fallback keyword guesser for ingredients missing from ingredients.yaml.
// Ported from index.html's former client-side getSection()/SECTION_KEYWORDS —
// kept only as a safety net so a new ingredient added without a registry
// entry still gets a reasonable section instead of breaking the build.

export const SECTION_KEYWORDS = [
  ["Fruit & Veg", ["potato", "onion", "carrot", "cabbage", "celery", "garlic", "ginger", "chilli", "chili", "lemongrass", "shallot", "lettuce", "tomato", "lime", "lemon", "spring onion", "fresh coriander", "mushroom", "aubergine", "cucumber", "eating apple", "curry leaves", "parsley", "mint", "basil", "peppers", "red pepper", "parsnip"]],
  ["Meat & Fish", ["chicken", "beef", "pork", "bacon", "gammon", "steak", "prawn", "chipolata", "lamb", "seafood"]],
  ["Deli & Dairy", ["cheese", "cheddar", "gruyère", "parmesan", "pecorino", "cream", "milk", "butter", "egg", "buttermilk", "yoghurt", "yogurt", "mozzarella", "feta"]],
  ["Bread & Bakery", ["bread", "sourdough", "bun", "tortilla"]],
  ["Tinned & Jarred", ["coconut milk", "tomato purée", "tamarind", "bbq sauce", "mustard", "stock", "peanuts", "mayonnaise", "chicken stock", "beef stock", "honey", "ketchup", "sriracha", "peanut butter", "chilli sauce", "chilli paste"]],
  ["Dry Goods & Spices", ["flour", "cornflour", "baking powder", "sugar", "rice", "spaghetti", "rigatoni", "pasta", "paprika", "cayenne", "cumin", "coriander", "cinnamon", "cardamom", "clove", "oregano", "thyme", "nutmeg", "salt", "pepper", "seasoning", "oil", "vinegar", "fish sauce", "worcestershire", "shrimp paste", "garlic powder", "onion powder", "mustard powder", "bay leaves", "turmeric", "sesame", "caraway", "soy sauce", "rosemary", "pine nuts", "fennel", "curry powder", "garam masala", "cornstarch", "noodles", "macaroni", "lasagne"]],
];

export function guessSection(ingredientName) {
  const lower = ingredientName.toLowerCase();
  let best = null;
  for (const [section, keywords] of SECTION_KEYWORDS) {
    for (const keyword of keywords) {
      if (lower.includes(keyword) && (!best || keyword.length > best.keyword.length)) {
        best = { section, keyword };
      }
    }
  }
  return best ? best.section : "Other";
}
