import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchUpstreamJson } from '../lib/fetchUpstreamJson.ts';

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
