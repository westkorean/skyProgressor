export interface CacheResult<T> { value: T; cachedAt: number; expiresAt: number; stale: boolean }

/** Process-local TTL cache with request coalescing and stale-on-error fallback. */
export class AsyncTTLCache<T> {
  private readonly ttlMs: number;
  private entry: { value: T; cachedAt: number; expiresAt: number; stale: boolean } | null = null;
  private pending: Promise<CacheResult<T>> | null = null;

  constructor(ttlMs: number) { this.ttlMs = ttlMs; }

  async get(loader: () => Promise<T>, now = Date.now()): Promise<CacheResult<T>> {
    if (this.entry && this.entry.expiresAt > now) return { ...this.entry };
    if (this.pending) return this.pending;
    this.pending = (async () => {
      try {
        const value = await loader();
        const cachedAt = Date.now();
        this.entry = { value, cachedAt, expiresAt: cachedAt + this.ttlMs, stale: false };
        return { ...this.entry };
      } catch (error) {
        if (this.entry) {
          this.entry = { ...this.entry, expiresAt: Date.now() + Math.min(this.ttlMs, 30_000), stale: true };
          return { ...this.entry };
        }
        throw error;
      } finally {
        this.pending = null;
      }
    })();
    return this.pending;
  }

  clear(): void { this.entry = null; this.pending = null; }
}
