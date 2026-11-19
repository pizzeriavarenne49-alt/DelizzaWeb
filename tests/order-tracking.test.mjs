import assert from "node:assert/strict";
import path from "node:path";
import { loadTsModule } from "./support/load-ts-module.mjs";

const appId = "d_lizza";
const uid = "customer_1";
let nextListener = null;
let nextError = null;
let unsubscribeCount = 0;
const docCalls = [];
const snapshotCalls = [];

const firestore = {
  doc(_db, collection, id) {
    docCalls.push([collection, id]);
    return { collection, id };
  },
  onSnapshot(ref, options, listener, errorListener) {
    snapshotCalls.push({ ref, options });
    nextListener = listener;
    nextError = errorListener;
    return () => { unsubscribeCount += 1; };
  },
};

const tracking = loadTsModule(path.resolve("src/services/customer-order-tracking.ts"), {
  "firebase/firestore": firestore,
  "@/config/firebase-client": {
    CLIENT_WL_APP_ID: appId,
    getClientFirestore: () => ({ name: "mock-db" }),
  },
  "@/services/customer-session": { DELIZZA_CUSTOMER_APP_ID: appId },
});
const presentation = loadTsModule(path.resolve("src/lib/customer-order-presentation.ts"));

function source(data, metadata = { fromCache: false, hasPendingWrites: false }, id = "order_1") {
  let dataCalls = 0;
  return {
    exists: () => data !== null,
    id,
    data: () => { dataCalls += 1; return data; },
    metadata,
    dataCalls: () => dataCalls,
  };
}

function order(overrides = {}) {
  return {
    appId,
    clientUserId: uid,
    orderNumber: "D-42",
    createdAt: "2026-10-25T18:00:00.000Z",
    pickupAt: "2026-10-25T18:30:00.000Z",
    totalCents: 2450,
    status: "paid",
    paymentStatus: "paid",
    fulfillmentData: { method: "clickAndCollect", specificStatus: "preparing" },
    productionAuthorized: true,
    paidTotalCents: 2450,
    internalOnly: "must-not-be-mapped",
    ...overrides,
  };
}

function subscribe(orderId = "order_1", userId = uid) {
  const states = [];
  const stop = tracking.watchCustomerOrder(orderId, userId, (state) => states.push(state));
  return { states, stop };
}

// The Firestore document reference is a single tenant-independent document ID;
// tenant and owner are consequently checked on every received document.
{
  const { states, stop } = subscribe();
  assert.deepEqual(docCalls.at(-1), ["orders", "order_1"]);
  assert.equal(snapshotCalls.at(-1).options.includeMetadataChanges, true);
  assert.deepEqual(states, []);
  nextListener(source(order({ status: "inPreparation", fulfillmentStatus: "preparing" })));
  assert.equal(states.at(-1).syncState, "live");
  assert.equal(states.at(-1).order.status, "inPreparation");
  assert.equal(states.at(-1).order.fulfillmentStatus, "preparing");
  assert.deepEqual(Object.keys(states.at(-1).order).sort(), [
    "appId", "clientUserId", "createdAt", "fulfillmentData", "fulfillmentStatus",
    "id", "itemLabels", "orderNumber", "paidTotalCents", "paymentStatus", "pickup",
    "productionAuthorized", "status", "totalCents",
  ]);
  assert.deepEqual(states.at(-1).order.itemLabels, []);
  assert.equal(states.at(-1).order.id, "order_1");
  stop();
}

// Kitchen lifecycle events are visible live and map to the customer copy.
for (const [status, phase, terminal] of [
  ["inPreparation", "preparing", false],
  ["ready", "ready", false],
  ["completed", "completed", true],
]) {
  const { states, stop } = subscribe(`kitchen_${status}`);
  nextListener(source(order({ status })));
  assert.equal(states.at(-1).order.status, status);
  const view = presentation.getCustomerOrderTracking(states.at(-1).order);
  assert.equal(view.phase, phase);
  assert.equal(view.terminal, terminal);
  stop();
}

// Final createOrder snapshots retain full, immutable Duo and supplement detail.
{
  const { states, stop } = subscribe("snapshot_detail");
  nextListener(source(order({ items: [{
    nameSnapshot: "Pizza Duo", quantity: 2,
    customizations: {
      duo: { version: 1,
        left: { name: "Margherita", base: "tomate", ingredients: [{ name: "Tomate" }, { name: "Mozzarella" }] },
        right: { name: "Reine", base: "creme", ingredients: [{ name: "Crème" }, { name: "Jambon" }] },
      },
      addedSupplements: [{ ingredientName: "Olives", priceDeltaCents: 125 }],
      removedIngredients: [{ ingredientName: "Oignon" }],
      selectedLegacyOptions: { cuisson: [{ choiceName: "Bien cuite", priceDeltaCents: 50 }] },
    },
  }], })));
  assert.deepEqual(states.at(-1).order.itemLabels, [
    "2× Pizza Duo", "Moitié 1 · Margherita · base tomate · Tomate, Mozzarella",
    "Moitié 2 · Reine · base crème · Crème, Jambon", "+ Olives · +1,25 €", "Sans Oignon", "Choix · Bien cuite · +0,50 €",
  ]);
  stop();
}

// Legacy snapshots remain readable without fabricating a missing supplement price.
{
  const { states, stop } = subscribe("legacy_detail");
  nextListener(source(order({ items: [{ nameSnapshot: "Pizza ancienne", customizations: { addedSupplements: [{ ingredientName: "Champignons" }] } }] })));
  assert.deepEqual(states.at(-1).order.itemLabels, ["Pizza ancienne", "+ Champignons"]);
  stop();
}

// Cancellation reaches the customer and is terminal.
{
  const { states, stop } = subscribe("cancelled_1");
  nextListener(source(order({ status: "cancelled", paymentStatus: "refunded" })));
  const state = states.at(-1);
  assert.equal(state.syncState, "complete");
  assert.equal(presentation.getCustomerOrderTracking(state.order).phase, "cancelled");
  assert.equal(presentation.getCustomerOrderTracking(state.order).terminal, true);
  stop();
}

// A full refund is terminal, whereas a payment flag alone is not a lifecycle transition.
{
  const { states, stop } = subscribe("refunded_1");
  nextListener(source(order({ status: "refunded", paymentStatus: "refunded" })));
  assert.equal(states.at(-1).syncState, "complete");
  const refund = presentation.getCustomerOrderTracking(states.at(-1).order);
  assert.equal(refund.phase, "cancelled");
  assert.equal(refund.title, "Commande remboursée");
  stop();
}

// A later preparation after ready must remain a live, non-terminal update.
{
  const { states, stop } = subscribe("rework_1");
  nextListener(source(order({ status: "ready" })));
  nextListener(source(order({ status: "inPreparation" })));
  nextListener(source(order({ status: "ready" })));
  assert.deepEqual(states.slice(-3).map((state) => state.order?.status), ["ready", "inPreparation", "ready"]);
  assert.deepEqual(states.slice(-3).map((state) => state.syncState), ["live", "live", "live"]);
  stop();
}

// A cached terminal view is informative but must keep its server listener alive.
{
  const before = unsubscribeCount;
  const { states, stop } = subscribe("cached_completed");
  nextListener(source(order({ status: "completed" }), { fromCache: true, hasPendingWrites: false }));
  assert.equal(states.at(-1).syncState, "syncing");
  assert.equal(states.at(-1).serverOrder, undefined);
  assert.equal(unsubscribeCount, before);
  nextListener(source(order({ status: "completed" }), { fromCache: false, hasPendingWrites: false }));
  assert.equal(states.at(-1).syncState, "complete");
  assert.equal(states.at(-1).serverOrder.status, "completed");
  assert.equal(unsubscribeCount, before + 1);
  stop();
}

// A local empty cache stays pending until the authoritative server document arrives.
{
  const { states, stop } = subscribe("cache_empty_1");
  nextListener(source(null, { fromCache: true, hasPendingWrites: false }));
  assert.deepEqual(states.at(-1), { order: null, syncState: "syncing", error: null });
  nextListener(source(order({ status: "ready" }), { fromCache: false, hasPendingWrites: false }));
  assert.equal(states.at(-1).syncState, "live");
  assert.equal(states.at(-1).order.status, "ready");
  stop();
}

// Pending metadata is never sufficient to complete a terminal order.
{
  const before = unsubscribeCount;
  const { states, stop } = subscribe("pending_completed");
  nextListener(source(order({ status: "completed" }), { fromCache: false, hasPendingWrites: true }));
  assert.equal(states.at(-1).syncState, "syncing");
  assert.equal(states.at(-1).serverOrder, undefined);
  assert.equal(unsubscribeCount, before);
  stop();
}

// Invalid IDs and an absent identity fail locally: no document reference or subscription is made.
for (const [invalidId, invalidUid] of [["bad/id", uid], ["short", uid], ["order_1", ""]]) {
  const beforeDocs = docCalls.length;
  const beforeSnapshots = snapshotCalls.length;
  const { states, stop } = subscribe(invalidId, invalidUid);
  assert.equal(states.at(-1).order, null);
  assert.equal(states.at(-1).syncState, "error");
  assert.equal(docCalls.length, beforeDocs);
  assert.equal(snapshotCalls.length, beforeSnapshots);
  stop();
}

// Tenant or owner rejection never exposes the received foreign document.
for (const denied of [
  order({ appId: "another_tenant" }),
  order({ clientUserId: "another_customer" }),
]) {
  const { states, stop } = subscribe("foreign_1");
  nextListener(source(denied));
  assert.equal(states.at(-1).order, null);
  assert.equal(states.at(-1).syncState, "error");
  assert.equal(typeof states.at(-1).error, "string");
  stop();
}

// Snapshot errors and cleanup do not leak a stale order or accept late callbacks.
{
  const { states, stop } = subscribe("error_1");
  nextListener(source(order()));
  nextError(new Error("permission-denied"));
  assert.equal(states.at(-1).order, null);
  assert.equal(states.at(-1).syncState, "error");
  assert.equal(typeof states.at(-1).error, "string");
  const count = states.length;
  stop();
  nextListener(source(order({ status: "ready" })));
  nextError(new Error("late"));
  assert.equal(states.length, count);
}

// A fresh subscription after unmount receives only its own callbacks.
{
  const first = subscribe("refresh_1");
  const firstListener = nextListener;
  first.stop();
  const second = subscribe("refresh_1");
  firstListener(source(order({ status: "completed" })));
  assert.equal(second.states.length, 0);
  nextListener(source(order({ status: "ready" })));
  assert.equal(second.states.at(-1).order.status, "ready");
  second.stop();
}

// A metadata-only callback does not create a new subscription or perform a direct get/write.
{
  const { states, stop } = subscribe("metadata_1");
  nextListener(source(order({ status: "ready" })));
  const metadataOnly = source(order({ status: "ready" }), { fromCache: false, hasPendingWrites: true });
  nextListener(metadataOnly);
  assert.equal(snapshotCalls.length, docCalls.length);
  stop();
}

console.log("ok - customer order tracking listener, lifecycle, tenancy and cleanup");
