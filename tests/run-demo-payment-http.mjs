// Local-only end-to-end callable proof. It creates an isolated synthetic
// customer/order in demo-web-duo and never contacts Stripe or production.
import admin from 'firebase-admin';
import assert from 'node:assert/strict';

const projectId = 'demo-web-duo';
const firestoreHost = '127.0.0.1:18787';
const authHost = '127.0.0.1:9099';
if (process.env.GCLOUD_PROJECT !== projectId || process.env.FIRESTORE_EMULATOR_HOST !== firestoreHost || process.env.FIREBASE_AUTH_EMULATOR_HOST !== authHost) {
  throw new Error('Refusing to run outside the dedicated loopback demo emulator.');
}
const suffix = `${Date.now()}`;
const email = `http-payment-${suffix}@demo.invalid`;
const password = `LocalDemo-${suffix}`;
const app = admin.initializeApp({ projectId }, `http-payment-${suffix}`);
const db = admin.firestore(app);
const callableUrl = (name) => `http://127.0.0.1:5001/${projectId}/europe-west1/${name}`;
const call = async (name, token, data) => {
  const response = await fetch(callableUrl(name), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data }),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`${name}: ${body.error?.status || response.status} ${body.error?.message || ''}`);
  return body.result;
};

try {
  const user = await admin.auth(app).createUser({ email, password, displayName: 'HTTP Demo Customer' });
  await admin.auth(app).setCustomUserClaims(user.uid, { customerAppId: 'd_lizza' });
  await db.doc(`wl_apps/d_lizza/customers/${user.uid}`).set({ appId: 'd_lizza', uid: user.uid, status: 'active', fixtureOnly: true });
  const authResponse = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const authBody = await authResponse.json();
  if (!authResponse.ok) throw new Error(`Auth emulator: ${authBody.error?.message || authResponse.status}`);
  const token = authBody.idToken;
  for (const data of [{ appId: 'other-demo-tenant', source: 'web' }, { appId: 'd_lizza', source: 'pos' }]) {
    await assert.rejects(call('createOrder', token, data), /FAILED_PRECONDITION App Check required/);
  }
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const items = [
    { catalogItemId: 'duo-marg-reine', quantity: 1, duo: { leftRecipeId: 'marg-local', rightRecipeId: 'reine-local' } },
    { catalogItemId: 'marg-local', quantity: 1, addedSupplements: ['extra-mozza-local'] },
  ];
  const preview = await call('previewContinuousPickupWindows', token, { appId: 'd_lizza', mode: 'cart', source: 'web', date, items });
  const window = preview.windows?.[0];
  if (!window) throw new Error('No capacity window returned by the emulator fixture.');
  const pickupAt = window.pickupAt;
  const pickupTime = new Date(pickupAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' });
  const payload = {
    appId: 'd_lizza', source: 'web', items, subtotalCents: 2468, taxCents: 247, totalCents: 2715,
    paymentId: `web_pending_http_${suffix}`, paymentMethod: 'card', idempotencyKey: `http-payment-${suffix}`,
    customerName: 'Client HTTP', customerPhone: '0612345678',
    legalAcceptance: { uid: user.uid, origin: 'web', termsVersion: 'cgu-2026-07', privacyVersion: 'privacy-2026-07' },
    fulfillmentData: { method: 'clickAndCollect', paymentTiming: 'before', isAsap: false, isPaid: false, slotDate: date, timeSlot: `${pickupTime}-${pickupTime}`, requestedPickupAt: pickupAt, pickupAt, serviceOpeningId: window.serviceOpeningId },
  };
  const create = await call('createOrder', token, payload);
  const duplicate = await call('createOrder', token, payload);
  assert.equal(duplicate.orderId, create.orderId);
  const intent = await call('createDemoPaymentIntent', token, { appId: 'd_lizza', orderId: create.orderId });
  const payment = { appId: 'd_lizza', orderId: create.orderId, paymentIntentId: intent.paymentIntentId };
  const completion = await call('completeDemoPayment', token, payment);
  await call('completeDemoPayment', token, payment);
  const foreignTenantRejected = await call('createDemoPaymentIntent', token, { appId: 'other_tenant', orderId: create.orderId })
    .then(() => false, () => true);
  const posRejected = await call('createOrder', token, {
    ...payload, source: 'pos', idempotencyKey: `http-pos-${suffix}`,
  }).then(() => false, () => true);
  const [orderDoc, proofDoc, receipt] = await Promise.all([
    db.doc(`orders/${create.orderId}`).get(), db.doc(`payment_proofs/proof_d_lizza_${create.orderId}`).get(),
    db.collection('fiscal_receipts').where('orderId', '==', create.orderId).get(),
  ]);
  const order = orderDoc.data() || {};
  assert.equal(order.totalCents, 2715);
  assert.equal(order.subtotalCents + order.taxCents, order.totalCents);
  assert.equal(order.items.length, 2);
  assert.equal(foreignTenantRejected, true);
  assert.equal(posRejected, true);
  if (order.paymentStatus !== 'paid' || !proofDoc.exists || receipt.size !== 1 || order.totalCents !== intent.amountCents) throw new Error('Persisted payment proof, receipt, or canonical amount mismatch.');
  console.log(JSON.stringify({ success: true, orderId: create.orderId, amountCents: order.totalCents, paymentStatus: order.paymentStatus, proof: proofDoc.exists, fiscalReceipts: receipt.size, simulated: completion.simulated === true, replay: true, foreignTenantRejected, posRejected }));
} finally {
  await app.delete();
}
