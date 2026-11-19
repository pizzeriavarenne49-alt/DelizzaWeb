import assert from "node:assert/strict";
import path from "node:path";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { connectFirestoreEmulator, disableNetwork, doc, enableNetwork, getFirestore, onSnapshot } from "firebase/firestore";
import admin from "firebase-admin";
import { loadTsModule } from "./support/load-ts-module.mjs";

const projectId = "demo-acquisition-marketing";
const firestoreHost = "127.0.0.1:9808";
const authHost = "127.0.0.1:9909";
const appId = "d_lizza";
const ownerEmail = "tracking-fixture@example.test";
const ownerPassword = "local-only-Fixture123!";
const otherEmail = "tracking-other@example.test";
const otherPassword = "local-only-Other123!";

if (!projectId.startsWith("demo-") || firestoreHost !== "127.0.0.1:9808" || authHost !== "127.0.0.1:9909") {
  throw new Error("Order tracking emulator tests refuse non-demo or non-loopback targets.");
}
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;
process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
process.env.GCLOUD_PROJECT = projectId;

const adminApp = admin.apps.find((candidate) => candidate?.name === "order-tracking-emulator")
  ?? admin.initializeApp({ projectId }, "order-tracking-emulator");
const adminDb = admin.firestore(adminApp);
const adminAuth = admin.auth(adminApp);

async function ensureUser(email, password) {
  try {
    return await adminAuth.getUserByEmail(email);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    return adminAuth.createUser({ email, password, emailVerified: true });
  }
}

const owner = await ensureUser(ownerEmail, ownerPassword);
const other = await ensureUser(otherEmail, otherPassword);
await adminAuth.setCustomUserClaims(owner.uid, { customerAppId: appId });
await adminAuth.setCustomUserClaims(other.uid, { customerAppId: appId });

async function seedCustomer(uid, tenant = appId) {
  await adminDb.doc(`wl_apps/${tenant}/customers/${uid}`).set({
    appId: tenant,
    uid,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function fixture(id, overrides = {}) {
  return {
    appId,
    clientUserId: owner.uid,
    orderNumber: "TRACK-LOCAL",
    createdAt: new Date("2026-10-25T18:00:00.000Z"),
    pickupAt: new Date("2026-10-25T18:30:00.000Z"),
    totalCents: 2450,
    status: "paid",
    paymentStatus: "paid",
    fulfillmentStatus: "preparing",
    fulfillmentData: { method: "clickAndCollect", specificStatus: "preparing" },
    productionAuthorized: true,
    paidTotalCents: 2450,
    fixtureOnly: true,
    ...overrides,
  };
}

async function write(id, values = {}) {
  await adminDb.doc(`orders/${id}`).set(fixture(id, values), { merge: true });
}

async function waitFor(predicate, label, describe = () => "") {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${label}: ${describe()}`);
}

async function client(email, password, suffix) {
  const web = initializeApp({ projectId, apiKey: `local-${suffix}`, authDomain: `${projectId}.local` }, `tracking-${suffix}`);
  const auth = getAuth(web);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const db = getFirestore(web);
  connectFirestoreEmulator(db, "127.0.0.1", 9808);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  // Refresh after Admin-set local claims before Firestore performs its first rules check.
  await credential.user.getIdToken(true);
  return { web, auth, db };
}

function trackingFor(db) {
  return loadTsModule(path.resolve("src/services/customer-order-tracking.ts"), {
    "firebase/firestore": { doc, onSnapshot },
    "@/config/firebase-client": { getClientFirestore: () => db },
    "@/services/customer-session": { DELIZZA_CUSTOMER_APP_ID: appId },
  });
}

await seedCustomer(owner.uid);
await seedCustomer(other.uid);
const ownerClient = await client(ownerEmail, ownerPassword, "owner");
const ownerTracking = trackingFor(ownerClient.db);

// Actual client SDK listener: paid → preparing → ready → preparing → ready → completed.
{
  const id = "track_fixture_lifecycle";
  await write(id);
  const states = [];
  const stop = ownerTracking.watchCustomerOrder(id, owner.uid, (state) => states.push(state));
  await waitFor(() => states.some((state) => state.order?.status === "paid"), "initial paid snapshot", () => JSON.stringify(states));
  for (const status of ["inPreparation", "ready", "inPreparation", "ready", "completed"]) {
    await write(id, { status });
    await waitFor(() => states.at(-1)?.order?.status === status, `${status} snapshot`);
  }
  assert.equal(states.at(-1).syncState, "complete");
  const count = states.length;
  await write(id, { status: "ready" });
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(states.length, count, "terminal server snapshot stops the listener");
  stop();
}

// Cancellation is a separate terminal path.
{
  const id = "track_fixture_cancelled";
  await write(id, { status: "cancelled" });
  const states = [];
  ownerTracking.watchCustomerOrder(id, owner.uid, (state) => states.push(state));
  await waitFor(() => states.at(-1)?.syncState === "complete", "cancelled completion");
  assert.equal(states.at(-1).order?.status, "cancelled");
}

// A refunded order is terminal; a paymentStatus alone does not turn a live order terminal.
{
  const id = "track_fixture_refunded";
  await write(id, { status: "refunded", paymentStatus: "refunded" });
  const states = [];
  ownerTracking.watchCustomerOrder(id, owner.uid, (state) => states.push(state));
  await waitFor(() => states.at(-1)?.syncState === "complete", "refunded completion");
  assert.equal(states.at(-1).order?.status, "refunded");
}

// Offline uses the most recent cache and reconnects to the current server value.
{
  const id = "track_fixture_offline";
  await write(id, { status: "ready" });
  const states = [];
  const stop = ownerTracking.watchCustomerOrder(id, owner.uid, (state) => states.push(state));
  await waitFor(() => states.some((state) => state.order?.status === "ready"), "online ready snapshot");
  await disableNetwork(ownerClient.db);
  await waitFor(() => states.at(-1)?.syncState === "syncing", "offline cached snapshot");
  await write(id, { status: "inPreparation" });
  await enableNetwork(ownerClient.db);
  await waitFor(() => states.at(-1)?.order?.status === "inPreparation" && states.at(-1)?.syncState === "live", "reconnected server snapshot");
  stop();
}

// A new listener is independent after the former one is disposed.
{
  const id = "track_fixture_refresh";
  await write(id, { status: "paid" });
  const first = [];
  const firstStop = ownerTracking.watchCustomerOrder(id, owner.uid, (state) => first.push(state));
  await waitFor(() => first.some((state) => state.order?.status === "paid"), "first listener");
  firstStop();
  await write(id, { status: "ready" });
  const second = [];
  const secondStop = ownerTracking.watchCustomerOrder(id, owner.uid, (state) => second.push(state));
  await waitFor(() => second.at(-1)?.order?.status === "ready", "refreshed listener");
  secondStop();
}

// Rules deny a different customer and the service refuses a cross-tenant document.
{
  const foreignClient = await client(otherEmail, otherPassword, "other");
  const otherTracking = trackingFor(foreignClient.db);
  const denied = [];
  otherTracking.watchCustomerOrder("track_fixture_lifecycle", other.uid, (state) => denied.push(state));
  await waitFor(() => denied.at(-1)?.syncState === "error", "other customer refusal");
  assert.equal(denied.at(-1).order, null);
  await signOut(foreignClient.auth);
  await deleteApp(foreignClient.web);

  const tenantId = "track_fixture_tenant";
  await adminDb.doc(`orders/${tenantId}`).set(fixture(tenantId, { appId: "other_tenant" }));
  const tenantDenied = [];
  ownerTracking.watchCustomerOrder(tenantId, owner.uid, (state) => tenantDenied.push(state));
  await waitFor(() => tenantDenied.at(-1)?.syncState === "error", "tenant refusal");
  assert.equal(tenantDenied.at(-1).order, null);
}

await signOut(ownerClient.auth);
await deleteApp(ownerClient.web);
await adminApp.delete();
console.log("ok - real Firestore/Auth emulator order tracking");
