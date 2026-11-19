// Only the synthetic browser fixture on the existing demo emulator can be changed.
import admin from "firebase-admin";
const status = process.argv[2];
if (!["pending", "paid", "inPreparation", "ready", "completed", "cancelled", "refunded"].includes(status)) {
  throw new Error("Unsupported fixture status");
}
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:9808";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9909";
const app = admin.initializeApp({ projectId: "demo-acquisition-marketing" }, "tracking-browser-fixture");
try {
  const ref = admin.firestore(app).doc("orders/track_fixture_browser");
  const current = await ref.get();
  if (!current.exists || current.data()?.fixtureOnly !== true || current.data()?.appId !== "d_lizza") {
    throw new Error("Synthetic fixture missing: run the emulator suite first.");
  }
  await ref.update({ status, paymentStatus: status === "pending" ? "pending" : status === "refunded" ? "refunded" : "paid",
    productionAuthorized: status !== "pending", paidTotalCents: status === "pending" ? 0 : 2450 });
  console.log(`Local browser fixture: ${status}`);
} finally { await app.delete(); }
