export interface UpstreamJsonResult {
  ok: boolean;
  status: number;
  data: unknown;
}

type NextFetchInit = RequestInit & {
  next?: { revalidate?: number };
};

type CachedResult = { expiresAt: number; value: UpstreamJsonResult };
const upstreamCache = new Map<string, CachedResult>();
const upstreamRequests = new Map<string, Promise<UpstreamJsonResult>>();
const MAX_CACHE_ENTRIES = 250;

function cacheKey(url: string, init: NextFetchInit): string {
  const headers = new Headers(init.headers);
  return `${init.method ?? 'GET'}:${url}:${headers.get('API-Key') ?? ''}`;
}

function pruneCache(now: number): void {
  for (const [key, entry] of upstreamCache) {
    if (entry.expiresAt <= now) upstreamCache.delete(key);
  }
  while (upstreamCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = upstreamCache.keys().next().value;
    if (typeof oldest !== 'string') break;
    upstreamCache.delete(oldest);
  }
}

export async function fetchUpstreamJson(
  url: string,
  init: NextFetchInit = {},
  timeoutMs = 8_000
): Promise<UpstreamJsonResult> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });

  let data: unknown = null;
  try {
    const body = await response.text();
    if (body) data = JSON.parse(body);
  } catch {
    throw new Error('Upstream returned invalid JSON');
  }

  return { ok: response.ok, status: response.status, data };
}

/** Bounded process-local cache for idempotent upstream reads. */
export function fetchUpstreamJsonCached(
  url: string,
  init: NextFetchInit = {},
  ttlMs = 30_000,
  timeoutMs = 8_000
): Promise<UpstreamJsonResult> {
  const key = cacheKey(url, init);
  const now = Date.now();
  const cached = upstreamCache.get(key);
  if (cached && cached.expiresAt > now) return Promise.resolve(cached.value);
  const pending = upstreamRequests.get(key);
  if (pending) return pending;

  const request = fetchUpstreamJson(url, init, timeoutMs).then((result) => {
    if (result.ok) {
      pruneCache(Date.now());
      upstreamCache.set(key, { expiresAt: Date.now() + Math.max(0, ttlMs), value: result });
    }
    return result;
  }).finally(() => upstreamRequests.delete(key));
  upstreamRequests.set(key, request);
  return request;
}

export function clearUpstreamJsonCache(): void {
  upstreamCache.clear();
  upstreamRequests.clear();
}
