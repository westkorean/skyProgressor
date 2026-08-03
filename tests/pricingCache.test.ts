import assert from 'node:assert/strict';
import test from 'node:test';
import { AsyncTTLCache } from '../lib/pricing/cache.ts';
import { bestAcquisitionPrice, priceAccessoryOpportunities } from '../lib/pricing/opportunities.ts';
import { parseMuseum } from '../lib/parseMuseum.ts';

test('pricing cache reuses fresh values and coalesces concurrent loads', async () => {
  const cache = new AsyncTTLCache<number>(60_000);
  let loads = 0;
  const loader = async () => { loads += 1; await Promise.resolve(); return 42; };
  const [first, concurrent] = await Promise.all([cache.get(loader), cache.get(loader)]);
  const cached = await cache.get(loader);
  assert.equal(first.value, 42); assert.equal(concurrent.value, 42); assert.equal(cached.value, 42); assert.equal(loads, 1);
});

test('pricing cache serves stale data when refresh fails', async () => {
  const cache = new AsyncTTLCache<number>(1);
  const first = await cache.get(async () => 25);
  const stale = await cache.get(async () => { throw new Error('offline'); }, first.expiresAt + 1);
  assert.equal(stale.value, 25); assert.equal(stale.stale, true);
  let retried = false;
  const grace = await cache.get(async () => { retried = true; return 30; });
  assert.equal(grace.value, 25); assert.equal(grace.stale, true); assert.equal(retried, false);
});

test('acquisition pricing selects the cheapest craft, Bazaar, or Auction path', () => {
  assert.deepEqual(bestAcquisitionPrice('ENCHANTED_DIAMOND', { ENCHANTED_DIAMOND: { unitPrice: 200, source: 'bazaar' } }, { ENCHANTED_DIAMOND: 150 }), { price: 150, source: 'craft' });
  assert.deepEqual(bestAcquisitionPrice('AUCTION_ITEM', { AUCTION_ITEM: { unitPrice: 500, source: 'auction-median' } }, {}), { price: 500, source: 'auction-median' });
});

test('accessory opportunities are priced and sorted cheapest first', () => {
  const priced = priceAccessoryOpportunities([
    { id: 'upgrade-EXPENSIVE', itemId: 'EXPENSIVE', title: 'Expensive', reason: 'upgrade', estimatedPrice: null, priceSource: null },
    { id: 'upgrade-CHEAP', itemId: 'CHEAP', title: 'Cheap', reason: 'upgrade', estimatedPrice: null, priceSource: null },
  ], { EXPENSIVE: { unitPrice: 1_000, source: 'auction-bin' }, CHEAP: { unitPrice: 100, source: 'auction-bin' } }, {});
  assert.deepEqual(priced.map((entry) => entry.title), ['Cheap', 'Expensive']);
  assert.equal(priced[0].estimatedPrice, 100);
});

test('museum chooses the cheapest missing donation from cached market pricing', () => {
  const uuid = 'abc123';
  const museum = parseMuseum({ success: true, profile: { [uuid]: { items: {}, special: [] } } }, uuid, {}, { ABYSMAL_LASSO: { unitPrice: 321, source: 'auction-bin' } });
  assert.equal(museum.cheapestNextDonation?.id, 'ABYSMAL_LASSO');
  assert.equal(museum.cheapestNextDonation?.estimatedCost, 321);
  assert.equal(museum.cheapestNextDonation?.priceSource, 'auction-bin');
});
