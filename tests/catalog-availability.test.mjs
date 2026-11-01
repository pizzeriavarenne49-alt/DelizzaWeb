import assert from 'node:assert/strict';
import path from 'node:path';
import { loadTsModule } from './support/load-ts-module.mjs';

const { unavailableStockLines, stockDemandByProduct, isAdditionalProductQuantityAvailable, canApplyCartQuantity, isProductUnavailable } = loadTsModule(path.resolve('src/lib/product-availability.ts'));
const cart = [{ catalogItemId: 'pizza', quantity: 2, cartKey: 'standard', nameSnapshot: '4 Fromages' },
  { catalogItemId: 'pizza', quantity: 2, cartKey: 'custom', nameSnapshot: '4 Fromages' }];
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 4 } }).length, 0);
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 0 } }).length, 2);
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 3 } }).length, 2);
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 4 } }).length, 0);
assert.equal(unavailableStockLines(cart, { pizza: { stockManaged: true, stockQty: 4, manualOutOfStock: true } }).length, 2);
assert.equal(isAdditionalProductQuantityAvailable(cart, 'pizza', 1, { pizza: { stockManaged: true, stockQty: 4 } }), false);
assert.equal(isAdditionalProductQuantityAvailable(cart, 'pizza', 1, { pizza: { stockManaged: false, stockQty: 0 } }), true);
assert.equal(isAdditionalProductQuantityAvailable([], 'pizza', 0, { pizza: { stockManaged: false } }), false);
assert.equal(isAdditionalProductQuantityAvailable([], 'pizza', 1, {}, { stockManaged: true, stockQty: 1 }), false, 'a removed live product cannot fall back to a stale card');
assert.equal(canApplyCartQuantity(cart, 'standard', 3, { pizza: { stockManaged: true, stockQty: 4 } }), false, 'functional cart increment rechecks the full candidate basket');
const formulaCart = [{ catalogItemId: 'formula', formulaId: 'formula', formulaStepChoices: { pizza: ['pizza'], drink: ['cola'] }, quantity: 2, cartKey: 'formula', nameSnapshot: 'Menu' }];
assert.deepEqual(Object.fromEntries(stockDemandByProduct(formulaCart)), { pizza: 2, cola: 2 });
assert.equal(unavailableStockLines(formulaCart, { pizza: { stockManaged: true, stockQty: 1 }, cola: { stockManaged: false } }).length, 1);
assert.equal(canApplyCartQuantity(formulaCart, 'formula', 3, { pizza: { stockManaged: true, stockQty: 2 }, cola: { stockManaged: false } }), false, 'formula increments check their components, not catalogItemId');

// The provider's queued state updater, rather than its render-time closure,
// must enforce the limit when several adds happen before a rerender.
let cartState;
const cartModule = loadTsModule(path.resolve('src/contexts/CartContext.tsx'), {
  react: {
    createContext: () => ({ Provider: 'provider' }),
    useContext: () => null,
    useEffect: () => {},
    useState: (initial) => {
      if (cartState === undefined) cartState = typeof initial === 'function' ? initial() : initial;
      return [cartState, (next) => { cartState = typeof next === 'function' ? next(cartState) : next; }];
    },
    useCallback: (callback) => callback,
  },
  'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
  '@/contexts/AuthContext': { useAuth: () => ({ user: null, loading: false }) },
  '@/types': { computeTaxFromTtcCents: () => 0 },
  '@/contexts/CatalogAvailabilityContext': { useCatalogAvailability: () => ({ pizza: { stockManaged: true, stockQty: 2 } }) },
  '@/marketing/marketing-client': { recordMarketingEvent: () => {} },
  '@/lib/product-availability': { isProductUnavailable, isAdditionalProductQuantityAvailable, canApplyCartQuantity },
});
const cartShell = cartModule.CartProvider({ children: null });
const cartProvider = cartShell.type(cartShell.props);
const cartValue = cartProvider.props.value;
const queuedProduct = { id: 'pizza', category: 'pizzas', name: 'Pizza', price_cents: 1200, tax_rate_bps: 1000, stockManaged: true, stockQty: 2 };
cartValue.addItem(queuedProduct);
cartValue.addItem(queuedProduct);
cartValue.addItem(queuedProduct);
assert.equal(cartState[0].quantity, 2, 'queued cart additions cannot exceed physical stock');

const liveDocs = new Map();
const liveSnap = (data) => ({ exists: () => data !== undefined, data: () => data });
const cartAvailability = loadTsModule(path.resolve('src/lib/cart-availability.ts'), {
  'firebase/firestore': {
    doc: (_db, collection, id) => ({ collection, id }),
    getDocFromServer: async (ref) => liveSnap(liveDocs.get(`${ref.collection}/${ref.id}`)),
  },
  '@/config/firebase-client': { getClientFirestore: () => ({}) },
});
const formulaLine = { ...formulaCart[0], taxRateBps: 1000, unitPriceCents: 1200, totalCents: 2400 };
liveDocs.set('wl_menu_formulas/formula', { appId: 'd_lizza', name: 'Menu midi', isActive: true });
liveDocs.set('wl_catalog_items/pizza', { appId: 'd_lizza', name: 'Pizza', categoryId: 'pizzas', priceCents: 1200, isActive: true, stockManaged: true, stockQty: 1 });
liveDocs.set('wl_catalog_items/cola', { appId: 'd_lizza', name: 'Cola', categoryId: 'boissons', priceCents: 250, isActive: true });
assert.equal((await cartAvailability.assessCartAvailability([formulaLine])).ok, false, 'formula component total must be checked');
liveDocs.set('wl_catalog_items/pizza', { appId: 'd_lizza', name: 'Pizza', categoryId: 'pizzas', priceCents: 1200, isActive: false, stockManaged: true, stockQty: 3 });
assert.equal((await cartAvailability.assessCartAvailability([formulaLine])).issues[0].kind, 'product_unavailable', 'inactive formula component blocks checkout');
liveDocs.set('wl_catalog_items/pizza', { appId: 'd_lizza', name: 'Pizza', categoryId: 'pizzas', priceCents: 1200, isActive: true, stockManaged: true, stockQty: 3 });
liveDocs.set('wl_menu_formulas/formula', { appId: 'd_lizza', name: 'Menu midi', isActive: false });
assert.equal((await cartAvailability.assessCartAvailability([formulaLine])).issues[0].kind, 'product_unavailable', 'inactive formula blocks checkout');
assert.equal((await cartAvailability.assessCartAvailability([{ ...formulaLine, quantity: 1.5 }])).ok, false, 'checkout rejects malformed quantities before stock aggregation');

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
class EventSourceDouble {
  static instance;
  constructor(url) { assert.equal(url, '/api/catalog/availability'); EventSourceDouble.instance = this; }
  close() { this.closed = true; }
}
globalThis.EventSource = EventSourceDouble;
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
  source = EventSourceDouble.instance;
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
