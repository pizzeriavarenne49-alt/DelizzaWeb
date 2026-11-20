import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const preflight = readFileSync("src/lib/cart-availability.ts", "utf8");
const editableParent = readFileSync("src/app/api/catalog/editable-product/[catalogItemId]/route.ts", "utf8");
const editableRecipes = readFileSync("src/app/api/catalog/editable-pizza-recipes/route.ts", "utf8");
const availability = readFileSync("src/app/api/catalog/availability/route.ts", "utf8");

assert.match(preflight, /d_lizza_pizza_duo_comptoir/);
assert.match(preflight, /api\/catalog\/editable-product/);
assert.doesNotMatch(preflight, /recipe\.categoryId !== "pizzas"/);
assert.match(preflight, /recipe\.recipeBase/);
assert.doesNotMatch(editableParent, /usesIsolatedPizzaDuoFirestoreEmulator/);
assert.doesNotMatch(editableRecipes, /usesIsolatedPizzaDuoFirestoreEmulator/);
assert.match(availability, /includeDuo/);

console.log("Pizza Duo web preflight contract passed");
