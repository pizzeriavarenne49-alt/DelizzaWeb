import admin from "firebase-admin";

const projectId = "demo-web-duo";
const appId = "d_lizza";
const firestoreHost = "127.0.0.1:18787";
const authHost = "127.0.0.1:9099";
const email = "delizza.duo.fixture@demo.invalid";
const password = "DemoDuoLocal-2026";

if (!projectId.startsWith("demo-") || firestoreHost !== "127.0.0.1:18787" || authHost !== "127.0.0.1:9099") {
  throw new Error("This fixture only permits demo-web-duo loopback emulators.");
}
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;
process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
const app = admin.initializeApp({ projectId }, "pizza-duo-auth-history-fixture");

try {
  const auth = admin.auth(app);
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    user = await auth.createUser({ email, password, displayName: "Client Démo Duo", emailVerified: true });
  }
  await auth.setCustomUserClaims(user.uid, { customerAppId: appId });
  const db = admin.firestore(app);
  await db.doc(`wl_apps/${appId}/customers/${user.uid}`).set({
    appId, uid: user.uid, status: "active", displayName: "Client Démo Duo", phone: "0612345678", fixtureOnly: true,
  }, { merge: true });

  const paid = {
    appId, clientUserId: user.uid, status: "paid", paymentStatus: "paid", fulfillmentStatus: "ready",
    productionAuthorized: true, paidTotalCents: 1225, fulfillmentData: { method: "clickAndCollect", specificStatus: "ready" }, fixtureOnly: true,
  };
  await db.doc("orders/demo_history_classic").set({
    ...paid, orderNumber: "DEMO-CLASSIC", totalCents: 1225,
    createdAt: new Date("2026-11-14T17:00:00.000Z"), pickupAt: new Date("2026-11-14T17:30:00.000Z"),
    items: [{ catalogItemId: "marg-local", nameSnapshot: "Margherita", quantity: 1, unitPriceCents: 1225, totalCents: 1225,
      customizations: { addedSupplements: [{ ingredientId: "extra-mozza-local", ingredientName: "Mozzarella supplémentaire", priceDeltaCents: 125 }] } }],
  }, { merge: true });
  await db.doc("orders/demo_history_duo").set({
    ...paid, orderNumber: "DEMO-DUO", totalCents: 1490, paidTotalCents: 1490,
    createdAt: new Date("2026-11-16T17:00:00.000Z"), pickupAt: new Date("2026-11-16T17:30:00.000Z"),
    items: [{ catalogItemId: "duo-marg-reine", nameSnapshot: "Pizza Duo", quantity: 1, unitPriceCents: 1490, totalCents: 1490,
      customizations: { duo: { version: 1,
        left: { recipeId: "marg-local", name: "Margherita", base: "tomate", ingredients: [{ name: "Tomate" }, { name: "Mozzarella" }] },
        right: { recipeId: "reine-local", name: "Reine", base: "creme", ingredients: [{ name: "Crème" }, { name: "Jambon" }, { name: "Champignons" }] },
      } } }],
  }, { merge: true });
  console.log(JSON.stringify({ email, password, uid: user.uid, orders: ["demo_history_classic", "demo_history_duo"] }));
} finally {
  await app.delete();
}
