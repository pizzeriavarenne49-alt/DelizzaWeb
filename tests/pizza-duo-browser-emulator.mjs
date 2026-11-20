import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18787" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw Error("Loopback demo emulators are required");
const project = "demo-web-duo";
const app = initializeApp({ projectId: project }, "browser-proof");
const db = getFirestore(app);
const childProcesses = [];
const homepage = "http://127.0.0.1:3217";
const base1 = "3LPzBegYvk8oA8rSVjkc";
const base2 = "PxEZOWgUxAHxedwWHOSp";
const tenant = { appId: "d_lizza" };
for (const [id, name, index] of [[base1, "Base Tomate", 1], [base2, "Base crème", 2]]) {
  await db.doc("wl_catalog_categories/" + id).set({ ...tenant, name, order: index, isActive: true });
}
for (const [id, name, categoryId] of [["p1", "Chorizo", base1], ["p2", "Chèvre miel", base2]]) {
  await db.doc("wl_catalog_items/" + id).set({ ...tenant, name, categoryId, isActive: true, visible: true,
    pizzaUnits: 1, ingredients: [name], price: { amountCents: 1290, currency: "EUR" } });
}
await db.doc("wl_catalog_items/d_lizza_pizza_duo_comptoir").set({ ...tenant, name: "Pizza Duo",
  kind: "pizza_duo", categoryId: base1, pizzaUnits: 1, isActive: false, visible: false, posDuoActive: false,
  price: { amountCents: 1490, currency: "EUR" } });
await db.doc("wl_apps/d_lizza").set({ ...tenant, pizzaDuoWebEnabled: true, pizzaDuoPosEnabled: false });
await db.doc("wl_online_ordering_status/d_lizza").set({ ...tenant, status: "open" });

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-H", "127.0.0.1", "-p", "3217"], {
  env: { ...process.env, FIREBASE_PROJECT_ID: project, NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key", NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:duo-ui",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-web-duo.firebaseapp.com", NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-web-duo.appspot.com",
    FIREBASE_CLIENT_EMAIL: "", FIREBASE_PRIVATE_KEY: "", WL_APP_ID: "d_lizza", NEXT_PUBLIC_WL_APP_ID: "d_lizza",
    NEXT_PUBLIC_ENABLE_PIZZA_DUO: "true", NEXT_PUBLIC_PIZZA_DUO_LOCAL_EMULATOR: "true",
    NEXT_PUBLIC_HOMEPAGE_TEST_MODE: "false", NEXT_PUBLIC_HALLOWEEN_LOCAL: "false", NEXT_PUBLIC_MARKETING_TEST_MODE: "false",
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "", NEXT_TELEMETRY_DISABLED: "1",
  }, stdio: ["ignore", "inherit", "inherit"], windowsHide: true,
});
childProcesses.push(server);
let socket;
try {
  for (let n = 0; n < 65; n++) {
    try { if ((await fetch(homepage + "/menu")).ok) break; } catch { /* start compiling */ }
    if (n === 64) throw Error("Next not ready");
    await delay(800);
  }
  const response = await fetch(homepage + "/api/catalog/editable-pizza-recipes");
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).map(({ recipeBase }) => recipeBase).sort(), ["creme", "tomate"]);
  const browser = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    ["--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-port=0",
      "--user-data-dir=" + await mkdtemp(path.join(tmpdir(), "duo-browser-")), "about:blank"], { windowsHide: true });
  childProcesses.push(browser);
  const port = await new Promise((resolve, reject) => {
    browser.once("error", reject);
    browser.stderr.on("data", (data) => {
      const match = String(data).match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (match) resolve(match[1]);
    });
  });
  const targets = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  function cdp(method, params = {}) {
    const requestId = ++id;
    return new Promise((resolve) => {
      socket.addEventListener("message", function handle(event) {
        const reply = JSON.parse(event.data);
        if (reply.id !== requestId) return;
        socket.removeEventListener("message", handle);
        resolve(reply.result);
      });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
  }
  const evaluate = async (expression) => (await cdp("Runtime.evaluate", { expression, returnByValue: true }))?.result?.value;
  async function eventually(expression) {
    for (let n = 0; n < 38; n++) {
      const value = await evaluate(expression);
      if (value) return value;
      await delay(400);
    }
    throw Error("Browser condition unmet: " + expression);
  }
  for (const width of [390, 1440]) {
    await cdp("Emulation.setDeviceMetricsOverride", { width, height: 840, deviceScaleFactor: 1, mobile: width === 390 });
    await cdp("Page.navigate", { url: homepage + "/menu?viewport=" + width });
    const view = await eventually(`(() => {
      document.querySelectorAll('button').forEach(b => { if (b.textContent.trim() === 'Tout refuser') b.click(); });
      const title = document.getElementById('pizza-duo-title');
      if (!title) { document.querySelector('button[aria-label="Voir le détail de Pizza Duo"]')?.click(); return null; }
      const d = title.closest('[role="dialog"]');
      return d.textContent.includes('Chorizo') && d.textContent.includes('Chèvre miel')
        ? { width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, align: getComputedStyle(d).alignItems } : null;
    })()`);
    assert.equal(view.width, width);
    assert.equal(view.scrollWidth, width);
    assert.equal(view.align, width === 390 ? "flex-end" : "center");
    await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent.startsWith('Chorizo'))?.click()`);
    await eventually(`(() => {
      const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent.startsWith('Chèvre miel') && b.hasAttribute('aria-pressed'));
      if (!b) return false;
      b.click(); return true;
    })()`);
    assert.equal(await eventually(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent.startsWith('Ajouter au panier'));
      if (!button || button.disabled) return false;
      if (!/14[.,]90/.test(button.textContent)) return false;
      button.click(); return true;
    })()`), true);
    await eventually(`!document.getElementById('pizza-duo-title') && JSON.stringify(localStorage).includes('d_lizza_pizza_duo_comptoir')`);
    await eventually(`(() => {
      const button = document.querySelector('button[aria-label="Ouvrir le panier"]');
      if (!button) return false;
      button.click(); return true;
    })()`);
    await eventually(`(() => {
      const button = Array.from(document.querySelectorAll('[aria-label="Panier"] button')).find(b => b.textContent.trim() === 'Modifier');
      if (!button) return false;
      button.click(); return true;
    })()`);
    await eventually(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent.trim().startsWith('Moitié 2'));
      if (!button) return false;
      button.click(); return true;
    })()`);
    await eventually(`(() => {
      const all = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent.trim() === 'Toutes');
      if (!all) return false;
      all.click(); return true;
    })()`);
    await eventually(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.hasAttribute('aria-pressed') && b.textContent.startsWith('Chorizo'));
      if (!button) return false;
      button.click(); return true;
    })()`);
    await eventually(`(() => {
      const button = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent.startsWith('Enregistrer les modifications'));
      if (!button || button.disabled) return false;
      button.click(); return true;
    })()`);
    await eventually(`!document.getElementById('pizza-duo-title') && !document.querySelector('[aria-label="Panier"]').textContent.includes('Chèvre miel')`);
    await evaluate(`document.querySelector('button[aria-label="Augmenter la quantité"]').click()`);
    await eventually(`/29[.,]80/.test(document.querySelector('[aria-label="Panier"]')?.textContent ?? '')`);
    await evaluate(`document.querySelector('button[aria-label="Diminuer la quantité"]').click()`);
    await eventually(`!/29[.,]80/.test(document.querySelector('[aria-label="Panier"]')?.textContent ?? '')`);
    await evaluate(`document.querySelector('button[aria-label="Diminuer la quantité"]').click()`);
    await eventually(`document.querySelector('[aria-label="Panier"]')?.textContent.includes('Votre panier est vide')`);
    console.log(`Duo browser configured, added, edited and removed at ${width}px`);
  }
} finally {
  socket?.close();
  for (const child of childProcesses.reverse()) child.kill();
  await deleteApp(app);
}
