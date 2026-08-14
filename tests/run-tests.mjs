import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadTsModule } from "./support/load-ts-module.mjs";

const slotContract = loadTsModule(path.resolve("src/lib/slot-contract.ts"));
const productionCapacityPreview = loadTsModule(path.resolve("src/lib/production-capacity-preview.ts"));
const middleware = loadTsModule(path.resolve("middleware.ts"));
const robots = loadTsModule(path.resolve("src/app/robots.ts"));
const sitemap = loadTsModule(path.resolve("src/app/sitemap.ts"));
const checkoutAttempt = loadTsModule(path.resolve("src/services/checkout-attempt.ts"));

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

run("paris date helpers stay on the Paris day boundary", () => {
  const reference = new Date("2026-07-27T22:30:00.000Z");

  assert.equal(slotContract.formatParisDate(reference), "2026-07-28");
  assert.equal(slotContract.getServiceDateForKey("today", reference), "2026-07-28");
  assert.equal(slotContract.getServiceDateForKey("tomorrow", reference), "2026-07-29");
});

run("paris date helpers handle daylight saving changes", () => {
  assert.equal(slotContract.formatParisDate(new Date("2026-03-29T00:30:00.000Z")), "2026-03-29");
  assert.equal(slotContract.formatParisDate(new Date("2026-10-25T00:30:00.000Z")), "2026-10-25");
  assert.equal(slotContract.getServiceDateForKey("tomorrow", new Date("2026-10-24T22:30:00.000Z")), "2026-10-26");
});

run("scheduled fulfillment payload includes the canonical slot contract", () => {
  const slot = {
    start: "12:00",
    end: "12:30",
    service: "lunch",
    remainingUnits: 3,
    remainingOrders: 2,
    status: "limited",
  };

  const payload = slotContract.buildScheduledFulfillmentData({
    appId: "d_lizza",
    serviceDate: "2026-07-28",
    slot,
    instructions: "Sans oignon",
    source: "web",
  });

  assert.deepEqual(payload, {
    method: "clickAndCollect",
    isAsap: false,
    isPaid: false,
    source: "web",
    paymentTiming: "before",
    scheduledTime: "12:00",
    timeSlot: "12:00-12:30",
    slotDate: "2026-07-28",
    serviceOpeningId: "d_lizza_2026-07-28_lunch",
    slotId: "2026-07-28_12:00",
    instructions: "Sans oignon",
  });

  assert.equal(slotContract.buildServiceOpeningId("d_lizza", "2026-07-28", "lunch"), "d_lizza_2026-07-28_lunch");
  assert.equal(slotContract.buildSlotId("2026-07-28", "12:00"), "2026-07-28_12:00");
});

run("slot equality includes the service key", () => {
  const left = { start: "12:00", end: "12:30", service: "lunch" };
  const right = { start: "12:00", end: "12:30", service: "lunch" };
  const differentService = { start: "12:00", end: "12:30", service: "dinner" };
  const differentEnd = { start: "12:00", end: "12:45", service: "lunch" };

  assert.equal(slotContract.isSameSlot(left, right), true);
  assert.equal(slotContract.isSameSlot(left, differentService), false);
  assert.equal(slotContract.isSameSlot(left, differentEnd), false);
});

run("scheduled payload derives all identifiers from the selected live slot", () => {
  const selected = {
    start: "19:15",
    end: "19:30",
    service: "dinner",
    remainingUnits: 1,
    remainingOrders: 1,
    status: "available",
  };
  const payload = slotContract.buildScheduledFulfillmentData({
    appId: "d_lizza",
    serviceDate: "2026-10-25",
    slot: selected,
  });

  assert.equal(payload.timeSlot, "19:15-19:30");
  assert.equal(payload.slotDate, "2026-10-25");
  assert.equal(payload.serviceOpeningId, "d_lizza_2026-10-25_dinner");
  assert.equal(payload.slotId, "2026-10-25_19:15");
});

run("capacity V2 preview maps one production bucket to a scheduled order payload", () => {
  const response = {
    capacityVersion: 2,
    basis: "server_cart",
    reservationStatus: "preview_only",
    totalPizzaUnits: 2,
    generatedAt: "2026-07-28T08:00:00.000Z",
    windows: [
      {
        pickupAt: "2026-07-28T10:30:00.000Z",
        productionStartAt: "2026-07-28T10:15:00.000Z",
        productionEndAt: "2026-07-28T10:30:00.000Z",
        totalPizzaUnits: 2,
        productionAllocations: [
          {
            allocationId: "alloc_1",
            slotId: "v2_d_lizza_2026-07-28_lunch_1785233700000",
            serviceOpeningId: "d_lizza_2026-07-28_lunch",
            startAt: "2026-07-28T10:15:00.000Z",
            endAt: "2026-07-28T10:30:00.000Z",
            units: 2,
          },
        ],
      },
    ],
  };

  const [slot] = productionCapacityPreview.mapPreviewResponseToScheduledOptions({
    appId: "d_lizza",
    requestedDate: "2026-07-28",
    response,
  });
  const payload = productionCapacityPreview.buildScheduledFulfillmentDataFromPickupOption({
    slot,
    instructions: "Couper les pizzas",
  });

  assert.equal(slot.start, "12:15");
  assert.equal(slot.end, "12:30");
  assert.equal(slot.service, "lunch");
  assert.equal(slot.slotDate, "2026-07-28");
  assert.equal(slot.serviceOpeningId, "d_lizza_2026-07-28_lunch");
  assert.equal(slot.slotId, "v2_d_lizza_2026-07-28_lunch_1785233700000");
  assert.deepEqual(payload, {
    method: "clickAndCollect",
    isAsap: false,
    isPaid: false,
    source: "web",
    paymentTiming: "before",
    scheduledTime: "12:30",
    timeSlot: "12:15-12:30",
    slotDate: "2026-07-28",
    serviceOpeningId: "d_lizza_2026-07-28_lunch",
    slotId: "v2_d_lizza_2026-07-28_lunch_1785233700000",
    requestedPickupAt: "2026-07-28T10:30:00.000Z",
    pickupAt: "2026-07-28T10:30:00.000Z",
    instructions: "Couper les pizzas",
  });
});

run("capacity V2 preview preserves multiple production buckets for a large cart", () => {
  const response = {
    capacityVersion: 2,
    basis: "server_cart",
    reservationStatus: "preview_only",
    totalPizzaUnits: 9,
    generatedAt: "2026-07-28T08:00:00.000Z",
    windows: [
      {
        pickupAt: "2026-07-28T17:45:00.000Z",
        productionStartAt: "2026-07-28T17:15:00.000Z",
        productionEndAt: "2026-07-28T17:45:00.000Z",
        totalPizzaUnits: 9,
        productionAllocations: [
          {
            allocationId: "alloc_1",
            slotId: "v2_d_lizza_2026-07-28_dinner_1785258900000",
            serviceOpeningId: "d_lizza_2026-07-28_dinner",
            startAt: "2026-07-28T17:15:00.000Z",
            endAt: "2026-07-28T17:30:00.000Z",
            units: 5,
          },
          {
            allocationId: "alloc_2",
            slotId: "v2_d_lizza_2026-07-28_dinner_1785259800000",
            serviceOpeningId: "d_lizza_2026-07-28_dinner",
            startAt: "2026-07-28T17:30:00.000Z",
            endAt: "2026-07-28T17:45:00.000Z",
            units: 4,
          },
        ],
      },
    ],
  };

  const [slot] = productionCapacityPreview.mapPreviewResponseToScheduledOptions({
    appId: "d_lizza",
    requestedDate: "2026-07-28",
    response,
  });
  const payload = productionCapacityPreview.buildScheduledFulfillmentDataFromPickupOption({ slot });

  assert.equal(slot.start, "19:15");
  assert.equal(slot.end, "19:45");
  assert.deepEqual(slot.productionSlotIds, [
    "v2_d_lizza_2026-07-28_dinner_1785258900000",
    "v2_d_lizza_2026-07-28_dinner_1785259800000",
  ]);
  assert.equal(payload.timeSlot, "19:15-19:45");
  assert.equal(payload.requestedPickupAt, "2026-07-28T17:45:00.000Z");
});

run("capacity V2 preview handles Europe/Paris midnight and DST without UTC day drift", () => {
  const midnightResponse = {
    capacityVersion: 2,
    basis: "server_cart",
    reservationStatus: "preview_only",
    totalPizzaUnits: 1,
    generatedAt: "2026-07-27T22:00:00.000Z",
    windows: [
      {
        pickupAt: "2026-07-27T22:15:00.000Z",
        productionStartAt: "2026-07-27T22:00:00.000Z",
        productionEndAt: "2026-07-27T22:15:00.000Z",
        totalPizzaUnits: 1,
        productionAllocations: [
          {
            allocationId: "alloc_midnight",
            slotId: "v2_d_lizza_2026-07-28_late_1785199200000",
            serviceOpeningId: "d_lizza_2026-07-28_late",
            startAt: "2026-07-27T22:00:00.000Z",
            endAt: "2026-07-27T22:15:00.000Z",
            units: 1,
          },
        ],
      },
    ],
  };
  const dstResponse = {
    capacityVersion: 2,
    basis: "server_cart",
    reservationStatus: "preview_only",
    totalPizzaUnits: 1,
    generatedAt: "2026-10-25T16:00:00.000Z",
    windows: [
      {
        pickupAt: "2026-10-25T18:30:00.000Z",
        productionStartAt: "2026-10-25T18:15:00.000Z",
        productionEndAt: "2026-10-25T18:30:00.000Z",
        totalPizzaUnits: 1,
        productionAllocations: [
          {
            allocationId: "alloc_dst",
            slotId: "v2_d_lizza_2026-10-25_dinner_1792952100000",
            serviceOpeningId: "d_lizza_2026-10-25_dinner",
            startAt: "2026-10-25T18:15:00.000Z",
            endAt: "2026-10-25T18:30:00.000Z",
            units: 1,
          },
        ],
      },
    ],
  };

  const [midnightSlot] = productionCapacityPreview.mapPreviewResponseToScheduledOptions({
    appId: "d_lizza",
    requestedDate: "2026-07-28",
    response: midnightResponse,
  });
  const [dstSlot] = productionCapacityPreview.mapPreviewResponseToScheduledOptions({
    appId: "d_lizza",
    requestedDate: "2026-10-25",
    response: dstResponse,
  });

  assert.equal(midnightSlot.slotDate, "2026-07-28");
  assert.equal(midnightSlot.start, "00:00");
  assert.equal(midnightSlot.end, "00:15");
  assert.equal(dstSlot.slotDate, "2026-10-25");
  assert.equal(dstSlot.start, "19:15");
  assert.equal(dstSlot.end, "19:30");
});

run("capacity V2 preview refuses incoherent opening and allocation identities", () => {
  const baseWindow = {
    pickupAt: "2026-07-28T10:30:00.000Z",
    productionStartAt: "2026-07-28T10:15:00.000Z",
    productionEndAt: "2026-07-28T10:30:00.000Z",
    totalPizzaUnits: 1,
    productionAllocations: [
      {
        allocationId: "alloc_1",
        slotId: "v2_other_2026-07-28_lunch_1785233700000",
        serviceOpeningId: "other_2026-07-28_lunch",
        startAt: "2026-07-28T10:15:00.000Z",
        endAt: "2026-07-28T10:30:00.000Z",
        units: 1,
      },
    ],
  };

  assert.throws(() => {
    productionCapacityPreview.mapPreviewWindowToScheduledOption({
      appId: "d_lizza",
      requestedDate: "2026-07-28",
      window: baseWindow,
    });
  }, /serviceOpeningId/);

  assert.throws(() => {
    productionCapacityPreview.mapPreviewWindowToScheduledOption({
      appId: "d_lizza",
      requestedDate: "2026-07-28",
      window: { ...baseWindow, productionAllocations: [] },
    });
  }, /production allocations/);
});

run("capacity V2 preview reflects cart size changes and empty availability", () => {
  const cartItems = productionCapacityPreview.buildPreviewCartItems([
    {
      catalogItemId: "pizza-margherita",
      categoryId: "pizza",
      nameSnapshot: "Margherita",
      quantity: 1,
      unitPriceCents: 1200,
      totalCents: 1200,
      taxRateBps: 1000,
      cartKey: "pizza-margherita",
    },
    {
      catalogItemId: "formule-midi",
      categoryId: "formula",
      nameSnapshot: "Formule midi",
      quantity: 2,
      unitPriceCents: 1600,
      totalCents: 3200,
      taxRateBps: 1000,
      cartKey: "formule-midi",
      formulaId: "formula_lunch",
      formulaStepChoices: { pizza: ["pizza-reine"] },
    },
  ]);

  assert.deepEqual(cartItems, [
    { catalogItemId: "pizza-margherita", quantity: 1 },
    {
      catalogItemId: "formule-midi",
      quantity: 2,
      formulaId: "formula_lunch",
      formulaStepChoices: { pizza: ["pizza-reine"] },
    },
  ]);

  const empty = productionCapacityPreview.mapPreviewResponseToScheduledOptions({
    appId: "d_lizza",
    requestedDate: "2026-07-28",
    response: {
      capacityVersion: 2,
      basis: "server_cart",
      reservationStatus: "preview_only",
      totalPizzaUnits: 99,
      generatedAt: "2026-07-28T08:00:00.000Z",
      windows: [],
    },
  });
  assert.deepEqual(empty, []);
});

run("capacity V2 selection identity includes pickup time, opening and slot id", () => {
  const left = {
    pickupAt: "2026-07-28T10:30:00.000Z",
    serviceOpeningId: "d_lizza_2026-07-28_lunch",
    slotId: "v2_d_lizza_2026-07-28_lunch_1",
  };

  assert.equal(productionCapacityPreview.isSameScheduledPickupOption(left, { ...left }), true);
  assert.equal(
    productionCapacityPreview.isSameScheduledPickupOption(left, { ...left, slotId: "v2_d_lizza_2026-07-28_lunch_2" }),
    false,
  );
  assert.equal(
    productionCapacityPreview.isSameScheduledPickupOption(left, { ...left, serviceOpeningId: "d_lizza_2026-07-28_dinner" }),
    false,
  );
});

run("checkout uses capacity V2 preview instead of getAvailableSlots V1", () => {
  const checkoutSource = readFileSync(path.resolve("src/app/(site)/checkout/CheckoutClient.tsx"), "utf8");

  assert.equal(checkoutSource.includes("getAvailableSlots"), false);
  assert.equal(checkoutSource.includes("previewScheduledPickupOptions"), true);
  assert.equal(checkoutSource.includes("previewRequestIdRef"), true);
  assert.equal(checkoutSource.includes("PICKUP_SLOT_UNAVAILABLE_MESSAGE"), true);
  assert.equal(checkoutSource.includes("isAsap: true"), false);
});

run("checkout attempt fingerprint changes with cart and pickup", () => {
  const base = {
    appId: "d_lizza",
    userId: "uid_1",
    items: [{ catalogItemId: "pizza-1", quantity: 1, selectedOptions: [] }],
    fulfillmentData: {
      method: "clickAndCollect",
      isAsap: false,
      isPaid: false,
      source: "web",
      paymentTiming: "before",
      pickupAt: "2026-07-31T17:30:00.000Z",
      slotId: "slot_1",
    },
    customerName: "Client",
    customerPhone: "+33601020304",
    useReward: false,
  };

  const same = checkoutAttempt.buildCheckoutAttemptFingerprint({
    ...base,
    items: [{ selectedOptions: [], quantity: 1, catalogItemId: "pizza-1" }],
  });
  const cartChanged = checkoutAttempt.buildCheckoutAttemptFingerprint({
    ...base,
    items: [{ catalogItemId: "pizza-1", quantity: 2, selectedOptions: [] }],
  });
  const slotChanged = checkoutAttempt.buildCheckoutAttemptFingerprint({
    ...base,
    fulfillmentData: { ...base.fulfillmentData, slotId: "slot_2" },
  });

  assert.equal(checkoutAttempt.buildCheckoutAttemptFingerprint(base), same);
  assert.notEqual(same, cartChanged);
  assert.notEqual(same, slotChanged);
});

run("checkout attempt fingerprint is canonical and pseudonymized", () => {
  const base = {
    appId: "d_lizza",
    userId: "uid_1",
    items: [
      {
        catalogItemId: "pizza-2",
        cartKey: "pizza-2:b",
        quantity: 1,
        unitPriceCents: 1300,
        totalCents: 1300,
        taxRateBps: 1000,
        selectedOptions: [{ optionId: "supp", choiceIds: ["olive", "fromage"], priceDeltaCents: 200 }],
      },
      {
        catalogItemId: "pizza-1",
        cartKey: "pizza-1:a",
        quantity: 2,
        unitPriceCents: 1200,
        totalCents: 2400,
        taxRateBps: 1000,
        selectedOptions: [{ optionId: "supp", choiceIds: ["champignon"], priceDeltaCents: 100 }],
        formulaId: "menu",
        formulaStepChoices: { main: ["pizza-1", "pizza-2"], drink: ["cola"] },
      },
    ],
    fulfillmentData: {
      method: "clickAndCollect",
      isAsap: false,
      isPaid: false,
      source: "web",
      paymentTiming: "before",
      pickupAt: "2026-07-31T17:30:00.000Z",
      serviceOpeningId: "d_lizza_2026-07-31_dinner",
      slotId: "slot_1",
      scheduledTime: "19:30",
    },
    customerName: "Alice Martin",
    customerPhone: "+33601020304",
    useReward: false,
  };

  const reordered = {
    ...base,
    items: [
      {
        ...base.items[1],
        selectedOptions: [{ optionId: "supp", choiceIds: ["champignon"], priceDeltaCents: 100 }],
        formulaStepChoices: { drink: ["cola"], main: ["pizza-2", "pizza-1"] },
      },
      {
        ...base.items[0],
        selectedOptions: [{ optionId: "supp", choiceIds: ["fromage", "olive"], priceDeltaCents: 200 }],
      },
    ],
  };

  const fingerprint = checkoutAttempt.buildCheckoutAttemptFingerprint(base);
  assert.equal(fingerprint, checkoutAttempt.buildCheckoutAttemptFingerprint(reordered));
  assert.notEqual(fingerprint, checkoutAttempt.buildCheckoutAttemptFingerprint({ ...base, customerPhone: "+33601020305" }));
  assert.notEqual(fingerprint, checkoutAttempt.buildCheckoutAttemptFingerprint({ ...base, useReward: true, rewardItemIndex: 0 }));
  assert.equal(fingerprint.includes("Alice"), false);
  assert.equal(fingerprint.includes("+33601020304"), false);
});

run("checkout attempt storage keeps only technical recovery data", () => {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", { value: { randomUUID: () => "uuid_1" } });
  }

  const fingerprint = checkoutAttempt.buildCheckoutAttemptFingerprint({
    appId: "d_lizza",
    userId: "uid_1",
    items: [{ catalogItemId: "pizza-1", cartKey: "k", quantity: 1, unitPriceCents: 1200, totalCents: 1200, taxRateBps: 1000 }],
    fulfillmentData: { method: "clickAndCollect", isAsap: false, isPaid: false, source: "web", paymentTiming: "before", pickupAt: "2026-07-31T17:30:00.000Z", slotId: "slot_1" },
    customerName: "Alice Martin",
    customerPhone: "+33601020304",
    useReward: false,
  });
  const first = checkoutAttempt.getOrCreateCheckoutAttempt(fingerprint);
  const second = checkoutAttempt.getOrCreateCheckoutAttempt(fingerprint);
  checkoutAttempt.rememberCheckoutAttemptOrder(fingerprint, "order_1");

  const serialized = [...store.values()].join("\n");
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.equal(checkoutAttempt.getStoredCheckoutAttemptOrderId(), "order_1");
  assert.equal(serialized.includes("Alice"), false);
  assert.equal(serialized.includes("+33601020304"), false);
  assert.equal(serialized.includes("pizza-1"), false);

  checkoutAttempt.clearCheckoutAttemptForOrder("other_order");
  assert.equal(checkoutAttempt.getStoredCheckoutAttemptOrderId(), "order_1");
  checkoutAttempt.clearCheckoutAttemptForOrder("order_1");
  assert.equal(checkoutAttempt.getStoredCheckoutAttemptOrderId(), null);
});

run("checkout source uses stable idempotency and submission lock", () => {
  const checkoutSource = readFileSync(path.resolve("src/app/(site)/checkout/CheckoutClient.tsx"), "utf8");
  const orderServiceSource = readFileSync(path.resolve("src/services/order-service.ts"), "utf8");
  const confirmationSource = readFileSync(path.resolve("src/app/(site)/order-confirmation/OrderConfirmationClient.tsx"), "utf8");

  assert.equal(orderServiceSource.includes("Date.now()"), false);
  assert.equal(orderServiceSource.includes("randomUUID().slice"), false);
  assert.equal(checkoutSource.includes("submittingRef.current"), true);
  assert.equal(checkoutSource.includes("getOrCreateCheckoutAttempt"), true);
  assert.equal(checkoutSource.includes("clearCheckoutAttempt"), false);
  assert.equal(confirmationSource.includes("clearCheckoutAttemptForOrder"), true);
  assert.equal(confirmationSource.includes('order?.paymentStatus === "paid"'), true);
});

run("confirmation source reads backend status and does not trust Stripe redirect status", () => {
  const source = readFileSync(path.resolve("src/app/(site)/order-confirmation/OrderConfirmationClient.tsx"), "utf8");

  assert.equal(source.includes("onSnapshot"), true);
  assert.equal(source.includes("paymentStatus"), true);
  assert.equal(source.includes("redirect_status"), false);
  assert.equal(source.includes("payment_intent_client_secret"), false);
});

run("coming soon lock covers public routes and api endpoints", () => {
  [
    "/",
    "/menu",
    "/menu/",
    "/checkout",
    "/checkout/",
    "/commande",
    "/order",
    "/cart",
    "/pizza-la-varenne",
    "/unknown-route",
    "/%63heckout",
    "/mentions-legales",
    "/privacy",
    "/cgu",
    "/auth",
    "/auth/",
    "/auth?mode=signup",
  ].forEach((pathname) => {
    assert.equal(middleware.resolveMaintenanceAction(pathname, true), "maintenance", pathname);
  });

  assert.equal(middleware.resolveMaintenanceAction("/api/order", true), "api");
  assert.equal(middleware.resolveMaintenanceAction("/api/order/", true), "api");
  assert.equal(middleware.resolveMaintenanceAction("/api", true), "api");
  assert.equal(middleware.resolveMaintenanceAction("/api/", true), "api");
  assert.equal(middleware.resolveMaintenanceAction("/_next/static/chunk.js", true), "next");
  assert.equal(middleware.resolveMaintenanceAction("/images/menu-delizza.webp", true), "next");
  assert.equal(middleware.resolveMaintenanceAction("/maintenance", true), "next");
  assert.equal(
    middleware.resolveMaintenanceAction("/auth", true, new URLSearchParams("mode=resetPassword&oobCode=abc")),
    "next",
  );
  assert.equal(middleware.resolveMaintenanceAction("/auth/", true, new URLSearchParams("mode=resetPassword&oobCode=abc")), "maintenance");
  assert.equal(middleware.resolveMaintenanceAction("/order-confirmation", true), "next");

  assert.equal(middleware.shouldBypassMaintenance("/robots.txt"), true);
  assert.equal(middleware.shouldBypassMaintenance("/sitemap.xml"), true);
  assert.equal(middleware.isApiPath("/api/create-order"), true);
  assert.equal(middleware.isApiPath("/checkout"), false);
});

run("api unavailable response is hard blocked during maintenance", () => {
  const response = middleware.createApiUnavailableResponse();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
});

run("robots and sitemap collapse during coming soon", () => {
  const builtRobots = robots.buildRobots(true);
  const builtSitemap = sitemap.buildSitemap(true);

  assert.deepEqual(builtRobots.rules, [{ userAgent: "*", disallow: ["/"] }]);
  assert.equal(builtRobots.sitemap, undefined);
  assert.deepEqual(builtSitemap, []);
});

run("robots and sitemap remain canonical when coming soon is off", () => {
  const builtRobots = robots.buildRobots(false);
  const builtSitemap = sitemap.buildSitemap(false);

  assert.deepEqual(builtRobots.rules, [{ userAgent: "*", disallow: ["/go", "/api/"] }]);
  assert.equal(builtRobots.sitemap, "https://www.delizza.fr/sitemap.xml");
  assert.ok(builtSitemap.some((entry) => entry.url === "https://www.delizza.fr/menu"));
});

console.log("all tests passed");
