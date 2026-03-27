import { describe, it, expect } from 'vitest';

import { CacheRegistry } from '../../server/infrastructure/CacheRegistry.js';

describe('CacheRegistry', () => {
  it('returns undefined on miss', () => {
    const cache = new CacheRegistry();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('stores and returns values until TTL expires', () => {
    let now = 1000;
    const cache = new CacheRegistry({ now: () => now });

    cache.set('k', { ok: true }, 50);
    expect(cache.get('k')).toEqual({ ok: true });

    now += 49;
    expect(cache.get('k')).toEqual({ ok: true });

    now += 1;
    expect(cache.get('k')).toBeUndefined();
  });

  it('deduplicates concurrent getOrExecute calls', async () => {
    const cache = new CacheRegistry();
    let calls = 0;

    const executor = async () => {
      calls++;
      await new Promise(r => setTimeout(r, 10));
      return { calls };
    };

    const [a, b] = await Promise.all([
      cache.getOrExecute('x', executor, 1000),
      cache.getOrExecute('x', executor, 1000),
    ]);

    expect(calls).toBe(1);
    expect(a).toEqual({ calls: 1 });
    expect(b).toEqual({ calls: 1 });

    const c = await cache.getOrExecute('x', executor, 1000);
    expect(c).toEqual({ calls: 1 });
    expect(calls).toBe(1);
  });

  it('does not allow storing undefined', () => {
    const cache = new CacheRegistry();
    expect(() => cache.set('k', undefined, 10)).toThrow(/undefined/i);
  });

  it('deletes cached entries by prefix', () => {
    const cache = new CacheRegistry();
    cache.set('convoys_all', ['a'], 1000);
    cache.set('convoys_open', ['b'], 1000);
    cache.set('status', { ok: true }, 1000);

    const deleted = cache.deleteByPrefix('convoys_');
    expect(deleted).toBe(2);
    expect(cache.get('convoys_all')).toBeUndefined();
    expect(cache.get('convoys_open')).toBeUndefined();
    expect(cache.get('status')).toEqual({ ok: true });
  });
});
