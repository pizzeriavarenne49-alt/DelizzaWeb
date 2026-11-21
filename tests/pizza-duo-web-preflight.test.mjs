import assert from "node:assert/strict";
import path from "node:path";
import { loadTsModule } from "./support/load-ts-module.mjs";

const {
  PIZZA_DUO_CATALOG_ID, createPizzaDuoComposition, getPizzaDuoRecipeBase, isPizzaDuoRecipe,
  getPizzaDuoSupplementOptions, getPizzaDuoUnitPriceCents, pizzaDuoOrderSelection, pizzaDuoCartKey,
} = loadTsModule(path.resolve("src/lib/pizza-duo.ts"));
const { buildPreviewCartItems } = loadTsModule(path.resolve("src/lib/production-capacity-preview.ts"));
const { customerOrderItemLabels } = loadTsModule(path.resolve("src/lib/customer-order-item-labels.ts"));

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

const mozza = {
  id: "mozza", appId: "d_lizza", name: "Mozzarella",
  defaultPriceModifier: { amountCents: 125, currency: "EUR" }, isActive: true,
};
const leftWithExtra = { ...tomato, ingredientLibrary: [mozza], availableSupplementIds: ["mozza"] };
const rightWithExtra = { ...cream, ingredientLibrary: [mozza], availableSupplementIds: ["mozza"] };
const leftSelection = { ingredientId: "mozza", target: "left" };
const rightSelection = { ingredientId: "mozza", target: "right" };
const half = createPizzaDuoComposition(leftWithExtra, rightWithExtra, [leftSelection]);
const whole = createPizzaDuoComposition(leftWithExtra, rightWithExtra, [leftSelection, rightSelection]);
const duoPolicy = { id: "pizza-duo", pizzaDuoSupplementIds: ["mozza"], ingredientLibrary: [mozza] };
const configuredHalf = createPizzaDuoComposition(tomato, cream, [leftSelection], duoPolicy);
const disabledDuoPolicy = { ...duoPolicy, pizzaDuoSupplementIds: [] };
const commonPolicy = { id: "pizza-duo", pizzaCommonSupplementIds: ["mozza"], ingredientLibrary: [mozza] };
assert.deepEqual(getPizzaDuoSupplementOptions(leftWithExtra, undefined, "left"), [mozza]);
assert.deepEqual(getPizzaDuoSupplementOptions(tomato, undefined, "left", commonPolicy), [mozza]);
assert.deepEqual(getPizzaDuoSupplementOptions(tomato, undefined, "whole", commonPolicy), []);
assert.deepEqual(getPizzaDuoSupplementOptions(tomato, undefined, "right", commonPolicy), []);
assert.equal(getPizzaDuoUnitPriceCents(duo), 1490);
assert.equal(getPizzaDuoUnitPriceCents(half), 1553);
assert.equal(getPizzaDuoUnitPriceCents(whole), 1615);
assert.equal(getPizzaDuoUnitPriceCents(configuredHalf), 1553);
assert.equal(getPizzaDuoUnitPriceCents(createPizzaDuoComposition(tomato, cream, [leftSelection], commonPolicy)), 1553);
assert.equal(createPizzaDuoComposition(leftWithExtra, rightWithExtra, [leftSelection], disabledDuoPolicy).supplements, undefined);
assert.equal(getPizzaDuoUnitPriceCents(createPizzaDuoComposition(leftWithExtra, cream, [{ ingredientId: "mozza", target: "whole" }])), 1490);
assert.deepEqual(pizzaDuoOrderSelection(whole).supplements, [{ ingredientId: "mozza", target: "whole" }]);
assert.notEqual(pizzaDuoCartKey("duo", half), pizzaDuoCartKey("duo", whole));
const removableTomato = { ...leftWithExtra, allowIngredientRemoval: true, baseIngredientIds: ["mozza"] };
const removedHalf = createPizzaDuoComposition(removableTomato, rightWithExtra, [], duoPolicy, { left: ["mozza"], right: [] }, { left: "crème" });
assert.deepEqual(pizzaDuoOrderSelection(removedHalf).removedIngredients, { left: ["mozza"], right: [] });
assert.deepEqual(pizzaDuoOrderSelection(removedHalf).baseOverrides, { left: "crème" });
const identicalHalves = createPizzaDuoComposition(removableTomato, removableTomato, [leftSelection], duoPolicy, { left: [], right: ["mozza"] }, { right: "crème" });
assert.deepEqual(pizzaDuoOrderSelection(identicalHalves), {
  leftRecipeId: tomato.id, rightRecipeId: tomato.id, supplements: [leftSelection],
  removedIngredients: { left: [], right: ["mozza"] }, baseOverrides: { right: "crème" },
});
assert.match(pizzaDuoCartKey("duo", removedHalf), /crème/);
assert.deepEqual(buildPreviewCartItems([{ catalogItemId: "duo", quantity: 2, duo: half }])[0].duo.supplements, [leftSelection]);
assert.match(customerOrderItemLabels({ items: [{ nameSnapshot: "Pizza Duo", customizations: { duo: { supplements: half.supplements } } }] }).join("\n"),
  /Moitié 1 · \+ Mozzarella · \+0,63 €/);

// Reopening a Duo from an old menu tab gets the latest parent and its
// currently selectable recipes from one catalogue read, including in its
// dedicated category. Plain Product reads for cart/edit remain compatible.
const parent = { ...commonPolicy, id: PIZZA_DUO_CATALOG_ID, category: "d_lizza_pizza_duo", kind: "pizza_duo" };
let catalogueReads = 0;
const { GET: readEditableProduct } = loadTsModule(
  path.resolve("src/app/api/catalog/editable-product/[catalogItemId]/route.ts"),
  {
    "next/server": { NextResponse: Response },
    "@/data/repository": { repo: {
      async getProducts() {
        catalogueReads += 1;
        return [parent, tomato, cream, { ...cream, id: "sold-out", manualOutOfStock: true }];
      },
    } },
  },
);
const previousTenant = process.env.WL_APP_ID;
process.env.WL_APP_ID = "d_lizza";
try {
  const params = { params: Promise.resolve({ catalogItemId: parent.id }) };
  const url = `https://example.invalid/api/catalog/editable-product/${parent.id}`;
  const detail = await readEditableProduct(new Request(`${url}?includeDuoRecipes=1`), params);
  assert.equal(detail.headers.get("cache-control"), "no-store");
  const refreshed = await detail.json();
  assert.deepEqual(refreshed.product.pizzaCommonSupplementIds, ["mozza"]);
  assert.deepEqual(refreshed.recipes.map((recipe) => recipe.id), [tomato.id, cream.id]);
  assert.equal(catalogueReads, 1);
  assert.equal((await (await readEditableProduct(new Request(url), params)).json()).id, parent.id);
} finally {
  if (previousTenant === undefined) delete process.env.WL_APP_ID;
  else process.env.WL_APP_ID = previousTenant;
}

const documents = new Map([tomato, cream].map((product) => [product.id, {
  appId: "d_lizza", categoryId: product.category, name: product.name, isActive: true, visible: true,
  pizzaUnits: 1, price: { amountCents: product.price_cents, currency: "EUR" },
}]));
documents.set("mozza", mozza);
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
let duoPolicyIds;
let commonPolicyIds;
let tenantCommonPolicyIds;
try {
  globalThis.fetch = async (target) => {
    if (target === "/api/catalog/pizza-common-supplements") {
      return Response.json(tenantCommonPolicyIds === undefined
        ? { configured: false }
        : { configured: true, ids: tenantCommonPolicyIds });
    }
    const id = String(target).split("/").pop();
    if (id === PIZZA_DUO_CATALOG_ID) {
      return webEnabled ? Response.json({
        name: "Pizza Duo", kind: "pizza_duo", active: true, pizzaUnits: 1, price_cents: 1490,
        ...(duoPolicyIds === undefined ? {} : { pizzaDuoSupplementIds: duoPolicyIds }),
        ...(commonPolicyIds === undefined ? {} : { pizzaCommonSupplementIds: commonPolicyIds }),
      }) : new Response(null, { status: 404 });
    }
    const product = documents.get(id);
    if (!product) return new Response(null, { status: 404 });
    return Response.json({
      name: product.name, category: product.categoryId, active: product.isActive,
      visible: product.visible, kind: product.kind, pizzaUnits: product.pizzaUnits,
      price_cents: product.price?.amountCents ?? product.priceCents,
      baseIngredientIds: product.baseIngredientIds ?? [],
      availableSupplementIds: product.availableSupplementIds ?? [],
      allowIngredientRemoval: product.allowIngredientRemoval,
    });
  };
  assert.equal((await assessCartAvailability(cart)).ok, true);
  assert.equal(reads.includes(PIZZA_DUO_CATALOG_ID), false);
  documents.get(tomato.id).availableSupplementIds = ["mozza"];
  const halfCart = [{ ...cart[0], duo: half }];
  assert.equal((await assessCartAvailability(halfCart)).ok, true);
  assert.equal((await assessCartAvailability([{ ...cart[0], duo: whole }])).ok, false);
  // A saved parent policy overrides per-recipe lists. Empty is intentional.
  documents.get(tomato.id).availableSupplementIds = [];
  duoPolicyIds = ["mozza"];
  assert.equal((await assessCartAvailability(halfCart)).ok, true);
  duoPolicyIds = [];
  assert.equal((await assessCartAvailability(halfCart)).ok, false);
  duoPolicyIds = undefined;
  // Tenant common list has the same availability semantics when the Duo has
  // no dedicated list; an explicit empty list still means no extras.
  commonPolicyIds = ["mozza"];
  assert.equal((await assessCartAvailability(halfCart)).ok, true);
  commonPolicyIds = [];
  assert.equal((await assessCartAvailability(halfCart)).ok, false);
  commonPolicyIds = undefined;
  // Classic pizzas must also revalidate against the server-projected common
  // list. Their raw Firestore document can still hold an older recipe list.
  documents.get(tomato.id).availableSupplementIds = [];
  tenantCommonPolicyIds = ["mozza"];
  const classicWithCommonExtra = [{ catalogItemId: tomato.id, nameSnapshot: tomato.name, quantity: 1, addedSupplements: ["mozza"] }];
  assert.equal((await assessCartAvailability(classicWithCommonExtra)).ok, true);
  documents.get(tomato.id).usePizzaCommonSupplements = false;
  assert.equal((await assessCartAvailability(classicWithCommonExtra)).ok, false);
  delete documents.get(tomato.id).usePizzaCommonSupplements;
  tenantCommonPolicyIds = [];
  assert.equal((await assessCartAvailability(classicWithCommonExtra)).ok, false);
  tenantCommonPolicyIds = undefined;
  documents.get(tomato.id).availableSupplementIds = ["mozza"];
  documents.set("mozza", { ...mozza, defaultPriceModifier: { amountCents: 150, currency: "EUR" } });
  assert.match((await assessCartAvailability(halfCart)).issues[0].message, /prix.*changé/);
  webEnabled = false;
  assert.equal((await assessCartAvailability(cart)).ok, false);
  webEnabled = true;
  documents.get(cream.id).categoryId = "drinks";
  assert.equal((await assessCartAvailability(cart)).ok, false);
} finally {
  globalThis.fetch = originalFetch;
}
console.log("Pizza Duo production-catalog and web preflight contracts passed");
