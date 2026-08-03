import assert from 'node:assert/strict';
import test from 'node:test';
import { clearUpstreamJsonCache, fetchUpstreamJson, fetchUpstreamJsonCached } from '../lib/fetchUpstreamJson.ts';

test('returns upstream status and parsed JSON', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true }), {
    status: 429,
    headers: { 'content-type': 'application/json' },
  });

  const result = await fetchUpstreamJson('https://example.invalid');
  assert.deepEqual(result, { ok: false, status: 429, data: { success: true } });
});

test('accepts an empty upstream response body', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response(null, { status: 204 });

  const result = await fetchUpstreamJson('https://example.invalid');
  assert.deepEqual(result, { ok: true, status: 204, data: null });
});

test('rejects invalid upstream JSON', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response('<html>error</html>', { status: 502 });

  await assert.rejects(
    fetchUpstreamJson('https://example.invalid'),
    /Upstream returned invalid JSON/
  );
});

test('cached upstream reads coalesce concurrent calls and reuse fresh data', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; clearUpstreamJsonCache(); });
  clearUpstreamJsonCache();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    await Promise.resolve();
    return new Response(JSON.stringify({ calls }), { status: 200 });
  };

  const [first, second] = await Promise.all([
    fetchUpstreamJsonCached('https://example.invalid/cached'),
    fetchUpstreamJsonCached('https://example.invalid/cached'),
  ]);
  const third = await fetchUpstreamJsonCached('https://example.invalid/cached');

  assert.equal(calls, 1);
  assert.deepEqual(first, second);
  assert.deepEqual(second, third);
});
