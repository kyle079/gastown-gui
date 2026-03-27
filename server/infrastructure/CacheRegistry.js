export class CacheRegistry {
  constructor({ now = () => Date.now() } = {}) {
    this._now = now;
    this._entries = new Map();
    this._pending = new Map();
  }

  get(key) {
    const entry = this._entries.get(key);
    if (!entry) return undefined;
    if (this._now() >= entry.expiresAt) {
      this._entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  set(key, value, ttlMs) {
    if (value === undefined) {
      throw new Error('CacheRegistry does not allow storing undefined values');
    }
    const ttl = Math.max(0, Number(ttlMs) || 0);
    this._entries.set(key, { value, expiresAt: this._now() + ttl });
  }

  delete(key) {
    this._entries.delete(key);
    this._pending.delete(key);
  }

  deleteByPrefix(prefix) {
    const safePrefix = String(prefix || '');
    if (!safePrefix) return 0;

    let deleted = 0;
    for (const key of this._entries.keys()) {
      if (key.startsWith(safePrefix)) {
        this._entries.delete(key);
        deleted++;
      }
    }
    for (const key of this._pending.keys()) {
      if (key.startsWith(safePrefix)) {
        this._pending.delete(key);
      }
    }
    return deleted;
  }

  clear() {
    this._entries.clear();
    this._pending.clear();
  }

  cleanup() {
    const now = this._now();
    let cleaned = 0;
    for (const [key, entry] of this._entries.entries()) {
      if (now >= entry.expiresAt) {
        this._entries.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  getOrExecute(key, executor, ttlMs) {
    const cached = this.get(key);
    if (cached !== undefined) return Promise.resolve(cached);

    const pending = this._pending.get(key);
    if (pending) return pending;

    const promise = Promise.resolve()
      .then(() => executor())
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => {
        this._pending.delete(key);
      });

    this._pending.set(key, promise);
    return promise;
  }
}
