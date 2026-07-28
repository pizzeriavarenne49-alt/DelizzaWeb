import assert from "node:assert/strict";
import path from "node:path";
import { loadTsModule } from "./support/load-ts-module.mjs";

const slotContract = loadTsModule(path.resolve("src/lib/slot-contract.ts"));
const middleware = loadTsModule(path.resolve("middleware.ts"));
const robots = loadTsModule(path.resolve("src/app/robots.ts"));
const sitemap = loadTsModule(path.resolve("src/app/sitemap.ts"));

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
