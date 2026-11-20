import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const project = "demo-delizza-homepage";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:18291";
process.env.STORAGE_EMULATOR_HOST = "http://127.0.0.1:19291";
const app = initializeApp({ projectId: project, storageBucket: "demo-delizza-homepage.appspot.com" }, "homepage-runtime-test");
const db = getFirestore(app);
const bucket = getStorage(app).bucket();
const firstImage = "website/d_lizza/home-promo/0123456789abcdef0123456789abcdef.jpg";
const replacementImage = "website/d_lizza/home-promo/fedcba9876543210fedcba9876543210.jpg";
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

async function putDocument(path, fields) {
  await db.doc(path).set(fields);
}

async function upload(path) {
  await bucket.file(path).save(jpeg, { metadata: { contentType: "image/jpeg" } });
}

function promotion(imagePath, endsAt = null) {
  const fields = { title: "Deux envies. Une seule pizza.", description: "Découvrez notre nouvelle Pizza Duo.", buttonLabel: "Composer ma Pizza Duo", action: "product", productId: "d_lizza_pizza_duo_comptoir", imagePath };
  if (endsAt) fields.endsAt = new Date(endsAt);
  return fields;
}

async function page(path = "/") {
  const response = await fetch(`http://127.0.0.1:3011${path}`);
  assert.equal(response.status, 200);
  return { text: await response.text(), headers: response.headers };
}

async function waitForServer(child) {
  let lastError;
  for (let attempt = 0; attempt < 35; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:3011/");
      if (response.ok) return;
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill();
  throw lastError ?? new Error("Next did not start");
}

await putDocument("wl_apps/d_lizza", { pizzaDuoWebEnabled: false, pizzaDuoPosEnabled: true });
await putDocument("wl_catalog_categories/base_tomate", { appId: "d_lizza", name: "Base tomate", isActive: true, order: 1 });
await putDocument("wl_catalog_items/margherita", {
  appId: "d_lizza", name: "Margherita", categoryId: "base_tomate", isActive: true, visible: true,
  price: { amountCents: 990, currency: "EUR" }, homepageFeatured: true, homepageOrder: 1, isNew: true,
});
await putDocument("wl_catalog_items/d_lizza_pizza_duo_comptoir", {
  appId: "d_lizza", name: "Pizza Duo", categoryId: "base_tomate", isActive: false, visible: false,
  kind: "pizza_duo", posDuoActive: true, pizzaUnits: 1, manualOutOfStock: false, price: { amountCents: 1490, currency: "EUR" },
});
await putDocument("wl_website_homepages/d_lizza", { appId: "d_lizza", draft: promotion(null) });

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3011"], {
  env: {
    ...process.env,
    FIREBASE_PROJECT_ID: project,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
    WL_APP_ID: "d_lizza",
    NEXT_PUBLIC_WL_APP_ID: "d_lizza",
    FIREBASE_STORAGE_BUCKET: "demo-delizza-homepage.appspot.com",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:18291",
    STORAGE_EMULATOR_HOST: "http://127.0.0.1:19291",
    NEXT_PUBLIC_HOMEPAGE_TEST_MODE: "true",
    FIREBASE_CLIENT_EMAIL: "",
    FIREBASE_PRIVATE_KEY: "",
  },
  stdio: "pipe",
});

try {
  await waitForServer(child);
  assert.doesNotMatch((await page()).text, /Deux envies\. Une seule pizza\./);

  await upload(firstImage);
  await putDocument("wl_website_homepages/d_lizza", { appId: "d_lizza", published: promotion(firstImage) });
  const published = await page();
  assert.match(published.text, /Deux envies\. Une seule pizza\./);
  assert.match(published.text, /Disponible au comptoir et par téléphone\./);
  assert.match(published.text, /14,90/);
  const image = await page(`/api/home-promotion-image?path=${encodeURIComponent(firstImage)}`);
  assert.equal(image.headers.get("content-type"), "image/jpeg");

  await upload(replacementImage);
  await putDocument("wl_website_homepages/d_lizza", { appId: "d_lizza", published: promotion(replacementImage) });
  assert.equal((await fetch(`http://127.0.0.1:3011/api/home-promotion-image?path=${encodeURIComponent(firstImage)}`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:3011/api/home-promotion-image?path=${encodeURIComponent(replacementImage)}`)).status, 200);

  await putDocument("wl_website_homepages/d_lizza", { appId: "d_lizza", published: promotion(replacementImage, "2020-01-01T00:00:00.000Z") });
  assert.doesNotMatch((await page()).text, /Deux envies\. Une seule pizza\./);
  console.log("isolated homepage runtime passed");
} finally {
  child.kill();
}
