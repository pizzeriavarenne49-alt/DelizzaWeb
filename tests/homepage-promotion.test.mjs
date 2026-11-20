import assert from "node:assert/strict";
import path from "node:path";
import { loadTsModule } from "./support/load-ts-module.mjs";

const promotion = loadTsModule(path.resolve("src/lib/homepage-promotion.ts"));

const photo = "website/d_lizza/home-promo/0123456789abcdef0123456789abcdef.jpg";
const product = (id, order = 0, fields = {}) => ({
  id, homepageFeatured: true, homepageOrder: order, kind: undefined,
  active: true, pizzaUnits: 1, price_cents: 1290, ...fields,
});
const published = (fields = {}) => ({
  title: "Deux envies. Une seule pizza.",
  description: "Choisissez deux recettes.",
  buttonLabel: "Découvrir",
  action: "product",
  productId: "margherita",
  imagePath: photo,
  ...fields,
});

assert.equal(promotion.isSafeHomepagePromotionImage(photo), true);
assert.equal(promotion.isSafeHomepagePromotionImage("website/d_lizza/home-promo/not-a-uuid.jpg"), false);
assert.equal(promotion.isSafeHomepagePromotionImage("website/other/home-promo/0123456789abcdef0123456789abcdef.jpg"), false);

assert.deepEqual(
  promotion.sortHomepageFeaturedProducts([
    product("z", 3), product("b", 1), product("a", 1), product("duo", 0, { kind: "pizza_duo" }), product("hidden", 0, { homepageFeatured: false }),
  ]).map((entry) => entry.id),
  ["a", "b", "z"],
);
assert.deepEqual(promotion.sortHomepageFeaturedProducts([]), []);

const standard = promotion.normalizePublishedHomepagePromotion(published(), [product("margherita")], null, false, new Date("2026-11-20T12:00:00Z"));
assert.equal(standard?.action, "product");
assert.equal(standard?.priceCents, 1290);
assert.equal(promotion.normalizePublishedHomepagePromotion(published({ productId: "missing" }), [], null, false), null);
assert.equal(promotion.normalizePublishedHomepagePromotion(published({ imagePath: null }), [product("margherita")], null, false), null);
assert.equal(promotion.normalizePublishedHomepagePromotion(published({ endsAt: new Date("2026-11-20T11:00:00Z") }), [product("margherita")], null, false, new Date("2026-11-20T12:00:00Z")), null);

const counterDuo = promotion.normalizePublishedHomepagePromotion(published({ productId: "d_lizza_pizza_duo_comptoir" }), [], 1490, true);
assert.equal(counterDuo?.action, "counter");
assert.equal(counterDuo?.counterOnly, true);
assert.equal(counterDuo?.priceCents, 1490);
const webDuo = promotion.normalizePublishedHomepagePromotion(published({ productId: "d_lizza_pizza_duo_comptoir" }), [product("d_lizza_pizza_duo_comptoir", 0, { kind: "pizza_duo", price_cents: 1490 })], 1490, false);
assert.equal(webDuo?.action, "product");
assert.equal(webDuo?.counterOnly, false);
assert.equal(promotion.normalizePublishedHomepagePromotion(published({ productId: "d_lizza_pizza_duo_comptoir" }), [], 1490, false), null);

console.log("homepage promotion contract passed");
