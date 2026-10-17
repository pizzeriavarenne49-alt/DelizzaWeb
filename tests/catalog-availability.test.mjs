import assert from 'node:assert/strict';
import path from 'node:path';
import { loadTsModule } from './support/load-ts-module.mjs';

const { unavailableStockLines } = loadTsModule(path.resolve('src/lib/product-availability.ts'));
const cart = [{ catalogItemId: 'pizza', quantity: 2, cartKey: 'standard', nameSnapshot: '4 Fromages' },
  { catalogItemId: 'pizza', quantity: 2, cartKey: 'custom', nameSnapshot: '4 Fromages' }];
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 4 } }).length, 0);
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 0 } }).length, 2);
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 3 } }).length, 2);
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 4 } }).length, 0);
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 4, manualOutOfStock: true } }).length, 2);

let emit;
let unsubscribed = 0;
let activeSource = true;
const tenant = 'isolated-test';
const mocks = {
  '@/config/firebase': { WL_APP_ID: tenant, getDb: () => ({ collection(name) {
    assert.equal(name, 'wl_catalog_items');
    return { where(field, op, value) {
      assert.deepEqual([field, op, value], ['appId', '==', tenant]);
      return { onSnapshot(next) { emit = next; return () => unsubscribed++; } };
    } };
  } }) },
  '@/data/repository': { isFirebaseSourceActive: () => activeSource },
  // The production predicate is exercised below against hidden products.
};
const publicPredicate = loadTsModule(path.resolve('src/lib/catalog-publication.ts')).isPublicProductDoc;
mocks['@/lib/catalog-publication'] = { isPublicProductDoc: publicPredicate };
const route = loadTsModule(path.resolve('src/app/api/catalog/availability/route.ts'), mocks);
const abort = new AbortController();
const response = await route.GET(new Request('http://localhost/api/catalog/availability?appId=other', { signal: abort.signal }));
assert.equal(response.headers.get('Content-Type'), 'text/event-stream');
assert.match(response.headers.get('Cache-Control'), /no-store/);
const reader = response.body.getReader();
const doc = (id, data) => ({ id, data: () => ({ appId: tenant, categoryId: 'pizzas', priceCents: 1200, isActive: true, ...data }) });
for (const stockQty of [4, 0, 6]) {
  emit({ docs: [doc('pizza', { name: '4 Fromages', stockManaged: true, stockQty, privateSupplierCost: 50 }),
    doc('hidden', { public: false }), doc('archived', { isArchived: true })] });
  const chunk = new TextDecoder().decode((await reader.read()).value);
  const data = JSON.parse(chunk.replace(/^data: /, ''));
  assert.deepEqual(data, { pizza: { stockManaged: true, stockQty, manualOutOfStock: false } });
}
abort.abort();
assert.equal(unsubscribed, 1);
assert.equal((await reader.read()).done, true);
// Disposing the response must also release its Firestore listener.
const cancelled = await route.GET(new Request('http://localhost/api/catalog/availability'));
await cancelled.body.cancel();
assert.equal(unsubscribed, 2);
activeSource = false;
assert.equal((await route.GET(new Request('http://localhost/api/catalog/availability'))).status, 204);

// Run the actual provider effect and hooks with an EventSource double.
let context;
let effect;
let state = null;
let source;
const previousEventSource = globalThis.EventSource;
globalThis.EventSource = class {
  constructor(url) { assert.equal(url, '/api/catalog/availability'); source = this; }
  close() { this.closed = true; }
};
try {
  const availability = loadTsModule(path.resolve('src/contexts/CatalogAvailabilityContext.tsx'), {
    react: {
      createContext: () => (context = { Provider: 'provider', value: null }),
      useContext: () => context.value,
      useState: () => [state, (value) => { state = value; context.value = value; }],
      useEffect: (callback) => { effect = callback; },
    },
    'react/jsx-runtime': { jsx: (_type, props) => props },
  });
  availability.CatalogAvailabilityProvider({ children: null });
  const dispose = effect();
  const pizza = { id: 'pizza', stockManaged: true, stockQty: 4 };
  for (const qty of [4, 0, 4]) {
    source.onmessage({ data: JSON.stringify({ pizza: { stockManaged: true, stockQty: qty } }) });
    assert.equal(availability.useLiveProduct(pizza).stockQty, qty);
    assert.equal(availability.useCartStockIssues(cart).length, qty === 0 ? 2 : 0);
  }
  dispose();
  assert.equal(source.closed, true);
} finally { globalThis.EventSource = previousEventSource; }
console.log('ok - public stock stream, tenant filtering, stale carts, live hooks and restock');
