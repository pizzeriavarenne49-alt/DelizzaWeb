import admin from "firebase-admin";

const projectId = "demo-acquisition-marketing";
const appId = "d_lizza";
const email = "tracking-fixture@example.test";
const password = "local-only-Fixture123!";
const firestoreHost = "127.0.0.1:9808";
const authHost = "127.0.0.1:9909";
if (!projectId.startsWith("demo-") || firestoreHost !== "127.0.0.1:9808" || authHost !== "127.0.0.1:9909") {
  throw new Error("Browser fixture seeding refuses non-demo or non-loopback targets.");
}
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;
process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
const app = admin.initializeApp({ projectId }, "order-tracking-browser-fixture");
try {
  const auth = admin.auth(app);
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    user = await auth.createUser({ email, password, emailVerified: true });
  }
  await auth.setCustomUserClaims(user.uid, { customerAppId: appId });
  const db = admin.firestore(app);
  await db.doc(`wl_apps/${appId}/customers/${user.uid}`).set({ appId, uid: user.uid, status: "active" }, { merge: true });
  await db.doc("orders/track_fixture_browser").set({
    appId, clientUserId: user.uid, orderNumber: "TRACK-BROWSER", createdAt: new Date(),
    pickupAt: new Date(Date.now() + 30 * 60 * 1000), totalCents: 2450, status: "paid",
    paymentStatus: "paid", fulfillmentStatus: "preparing",
    fulfillmentData: { method: "clickAndCollect", specificStatus: "preparing" },
    productionAuthorized: true, paidTotalCents: 2450, fixtureOnly: true,
  }, { merge: true });
  console.log("ok - browser fixture track_fixture_browser seeded on demo emulator");
} finally { await app.delete(); }
