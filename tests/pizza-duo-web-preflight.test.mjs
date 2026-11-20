import assert from "node:assert/strict";
import path from "node:path";
import { loadTsModule } from "./support/load-ts-module.mjs";

const {
  PIZZA_DUO_CATALOG_ID, createPizzaDuoComposition, getPizzaDuoRecipeBase, isPizzaDuoRecipe,
} = loadTsModule(path.resolve("src/lib/pizza-duo.ts"));

const tomatoCategory = "3LPzBegYvk8oA8rSVjkc";
const creamCategory = "PxEZOWgUxAHxedwWHOSp";
const tomato = { id: "chorizo", name: "Chorizo", category: tomatoCategory, pizzaUnits: 1, active: true, price_cents: 1390, ingredients: ["Chorizo"], baseIngredientIds: [] };
const cream = { ...tomato, id: "chevre", name: "Chèvre miel", category: creamCategory, ingredients: ["Chèvre"] };
assert.equal(isPizzaDuoRecipe(tomato), true);
assert.equal(isPizzaDuoRecipe(cream), true);
assert.equal(getPizzaDuoRecipeBase("drinks", "tomate"), undefined);
assert.equal(getPizzaDuoRecipeBase("pizzas", "crème"), "creme");
const duo = createPizzaDuoComposition(tomato, cream);
assert.equal(duo.leftRecipe.base, "tomate");
assert.equal(duo.rightRecipe.base, "creme");

const documents = new Map([tomato, cream].map((product) => [product.id, {
  appId: "d_lizza", categoryId: product.category, name: product.name, isActive: true, visible: true,
  pizzaUnits: 1, price: { amountCents: product.price_cents, currency: "EUR" },
}]));
// An authenticated customer may be able to read the private parent. The
// checkout must still consult the channel projection and never use that doc.
documents.set(PIZZA_DUO_CATALOG_ID, { appId: "d_lizza", isActive: false, visible: false });
const reads = [];
const { assessCartAvailability } = loadTsModule(path.resolve("src/lib/cart-availability.ts"), {
  "@/config/firebase-client": { getClientFirestore: () => ({}) },
  "firebase/firestore": {
    doc: (_db, _collection, id) => id,
    getDocFromServer: async (id) => {
      reads.push(id);
      return { exists: () => documents.has(id), data: () => documents.get(id) };
    },
  },
});
const cart = [{ catalogItemId: PIZZA_DUO_CATALOG_ID, nameSnapshot: "Pizza Duo", quantity: 1, duo }];
const originalFetch = globalThis.fetch;
let webEnabled = true;
try {
  globalThis.fetch = async (target) => {
    assert.equal(target, "/api/catalog/editable-product/" + PIZZA_DUO_CATALOG_ID);
    return webEnabled ? Response.json({
      name: "Pizza Duo", kind: "pizza_duo", active: true, pizzaUnits: 1, price_cents: 1490,
    }) : new Response(null, { status: 404 });
  };
  assert.equal((await assessCartAvailability(cart)).ok, true);
  assert.equal(reads.includes(PIZZA_DUO_CATALOG_ID), false);
  webEnabled = false;
  assert.equal((await assessCartAvailability(cart)).ok, false);
  webEnabled = true;
  documents.get(cream.id).categoryId = "drinks";
  assert.equal((await assessCartAvailability(cart)).ok, false);
} finally {
  globalThis.fetch = originalFetch;
}
console.log("Pizza Duo production-catalog and web preflight contracts passed");
