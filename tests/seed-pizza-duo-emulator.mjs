import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (projectId !== "demo-web-duo" || emulatorHost !== "127.0.0.1:18787") {
  throw new Error("This fixture may only target the demo-web-duo Firestore emulator.");
}

if (getApps().length === 0) initializeApp({ projectId });
const db = getFirestore();
db.settings({ host: emulatorHost, ssl: false });

const commonPizza = {
  appId: "d_lizza",
  categoryId: "pizzas",
  isActive: true,
  visible: true,
  published: true,
  pizzaUnits: 1,
  taxRateBps: 1000,
  currency: "EUR",
  manualOutOfStock: false,
  stockManaged: false,
  imageUrl: "/images/placeholder.svg",
};

// Checkout screenshots use the real capacity callable.  These records stay in
// the loopback `demo-web-duo` project and deliberately provide a modest,
// explicit V2 service window rather than bypassing capacity validation.
const capacityConfig = {
  appId: "d_lizza",
  capacityVersion: 2,
  timeZone: "Europe/Paris",
  slotDurationMinutes: 15,
  maxPizzaUnitsPerSlot: 8,
  services: {
    lunch: {
      capacityVersion: 2,
      start: "11:30",
      end: "14:00",
      slotDurationMinutes: 15,
      maxPizzaUnitsPerSlot: 8,
    },
    dinner: {
      capacityVersion: 2,
      start: "17:30",
      end: "23:45",
      slotDurationMinutes: 15,
      maxPizzaUnitsPerSlot: 8,
    },
  },
};

await db.collection("wl_apps").doc("d_lizza").set({
  appId: "d_lizza",
  timeZone: "Europe/Paris",
  defaultDailyProductionUnits: 80,
  fixtureOnly: true,
}, { merge: true });
await db.collection("wl_time_slots_config").doc("d_lizza").set(capacityConfig, { merge: true });

const today = new Date();
for (let offset = 0; offset < 8; offset += 1) {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset))
    .toISOString().slice(0, 10);
  for (const serviceKey of ["lunch", "dinner"]) {
    await db.collection("wl_service_openings").doc(`d_lizza_${date}_${serviceKey}`).set({
      appId: "d_lizza",
      date,
      serviceKey,
      status: "open",
      capacityVersion: 2,
      fixtureOnly: true,
    }, { merge: true });
  }
}

await db.collection("wl_catalog_categories").doc("pizzas").set({
  appId: "d_lizza", isActive: true, visible: true, published: true, name: "Pizzas", order: 1,
});
await db.collection("wl_catalog_items").doc("duo-marg-reine").set({
  ...commonPizza,
  kind: "pizza_duo",
  name: "Pizza Duo",
  description: "Deux recettes, une pizza à partager.",
  imageUrl: "/images/placeholder.svg",
  price: { amountCents: 1490, currency: "EUR" },
});
await db.collection("wl_catalog_items").doc("marg-local").set({
  ...commonPizza,
  name: "Margherita",
  description: "Sauce tomate, mozzarella et basilic.",
  imageUrl: "/api/demo-assets/margherita-demo.webp",
  recipeBase: "tomate",
  // Public recipe ingredient labels use the same string-array contract as the
  // existing web catalogue. Ingredient IDs are reserved for editable extras.
  ingredients: ["Tomate", "Mozzarella"],
  baseIngredientIds: ["sauce-tomate", "mozzarella"],
  availableSupplementIds: ["extra-mozza-local"],
  allowIngredientRemoval: true,
  options: [{
    id: "cuisson-local",
    name: "Cuisson",
    type: "single",
    required: false,
    pricingMode: "delta",
    order: 1,
    choices: [
      { id: "cuisson-normale-local", name: "Normale", isActive: true, priceModifier: { amountCents: 0, currency: "EUR" } },
      { id: "cuisson-bien-cuite-local", name: "Bien cuite", isActive: true, priceModifier: { amountCents: 50, currency: "EUR" } },
    ],
  }],
  price: { amountCents: 1100, currency: "EUR" },
});
await db.collection("wl_ingredient_library").doc("extra-mozza-local").set({
  appId: "d_lizza",
  name: "Mozzarella supplémentaire",
  isActive: true,
  defaultPriceModifier: { amountCents: 125, currency: "EUR" },
});
await db.collection("wl_ingredient_library").doc("sauce-tomate").set({
  appId: "d_lizza", name: "Sauce tomate", isActive: true,
  defaultPriceModifier: { amountCents: 0, currency: "EUR" },
});
await db.collection("wl_ingredient_library").doc("mozzarella").set({
  appId: "d_lizza", name: "Mozzarella", isActive: true,
  defaultPriceModifier: { amountCents: 0, currency: "EUR" },
});
await db.collection("wl_catalog_items").doc("reine-local").set({
  ...commonPizza,
  name: "Reine",
  description: "Crème, jambon et champignons.",
  imageUrl: "/api/demo-assets/reine-demo.jpg",
  recipeBase: "creme",
  ingredients: ["Crème", "Jambon", "Champignons"],
  price: { amountCents: 1350, currency: "EUR" },
});
await db.collection("wl_catalog_items").doc("orientale-demo").set({
  ...commonPizza, name: "Chorizo", recipeBase: "tomate", description: "Tomate, chorizo, poivrons et mozzarella.", imageUrl: "/api/demo-assets/chorizo-demo.jpg",
  ingredients: ["Tomate", "Chorizo", "Poivrons", "Mozzarella"],
  price: { amountCents: 1450, currency: "EUR" },
});
await db.collection("wl_catalog_items").doc("quatre-fromages-demo").set({
  ...commonPizza, name: "Quatre Fromages", recipeBase: "creme", description: "Crème et quatre fromages.", imageUrl: "/api/demo-assets/quatre-fromages-demo.webp",
  ingredients: ["Crème", "Mozzarella", "Bleu", "Chèvre"],
  price: { amountCents: 1490, currency: "EUR" },
});

console.log("Seeded demo-web-duo fixture in Firestore emulator only.");
