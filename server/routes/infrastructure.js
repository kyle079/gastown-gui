/**
 * Infrastructure routes — scheduler, dogs (the Pack), escalations, merge queue,
 * refinery/witness status, Dolt health, changelog, and rig list.
 *
 * Each endpoint wraps a `gt` CLI call with a short TTL cache. Cache can be
 * bypassed with `?refresh=true`.
 */

const TTL = {
  scheduler: 15_000,
  dogs: 15_000,
  escalations: 10_000,
  mq: 10_000,
  refineryStatus: 10_000,
  witnessStatus: 10_000,
  doltHealth: 30_000,
  changelog: 60_000,
  rigList: 30_000,
};

function cacheKey(name, ...parts) {
  return [name, ...parts].join(':');
}

async function cachedGet({ cache, key, ttl, fetch }) {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const value = await fetch();
  cache.set(key, value, ttl);
  return value;
}

export function registerInfrastructureRoutes(app, { gtGateway, cache } = {}) {
  if (!gtGateway) throw new Error('registerInfrastructureRoutes requires gtGateway');
  if (!cache) throw new Error('registerInfrastructureRoutes requires cache');

  // --- Scheduler ---

  app.get('/api/scheduler/status', async (req, res) => {
    try {
      const key = 'scheduler:status';
      const refresh = req.query.refresh === 'true';
      if (refresh) cache.delete(key);

      const data = await cachedGet({
        cache,
        key,
        ttl: TTL.scheduler,
        fetch: async () => {
          const result = await gtGateway.schedulerStatus();
          if (!result.ok && !result.data) throw new Error(result.error || 'Scheduler status failed');
          return result.data ?? null;
        },
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Dogs (the Pack) ---

  app.get('/api/dogs', async (req, res) => {
    try {
      const key = 'dogs:list';
      const refresh = req.query.refresh === 'true';
      if (refresh) cache.delete(key);

      const data = await cachedGet({
        cache,
        key,
        ttl: TTL.dogs,
        fetch: async () => {
          const [listResult, statusResult] = await Promise.all([
            gtGateway.dogList(),
            gtGateway.dogStatus(),
          ]);
          const dogs = listResult.data ?? [];
          const summary = statusResult.data ?? null;
          return { dogs, summary };
        },
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Escalations ---

  app.get('/api/escalations', async (req, res) => {
    try {
      const key = 'escalations:list';
      const refresh = req.query.refresh === 'true';
      if (refresh) cache.delete(key);

      const data = await cachedGet({
        cache,
        key,
        ttl: TTL.escalations,
        fetch: async () => {
          const result = await gtGateway.escalationList();
          return result.data ?? [];
        },
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/escalations/:id/ack', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await gtGateway.escalationAck(id);
      if (!result.ok) return res.status(500).json({ error: result.error || 'Ack failed' });
      cache.delete('escalations:list');
      res.json({ success: true, id, raw: result.raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/escalations/:id/close', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await gtGateway.escalationClose(id, reason);
      if (!result.ok) return res.status(500).json({ error: result.error || 'Close failed' });
      cache.delete('escalations:list');
      res.json({ success: true, id, raw: result.raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Merge Queue ---

  app.get('/api/mq/:rig', async (req, res) => {
    try {
      const { rig } = req.params;
      const key = cacheKey('mq', rig);
      const refresh = req.query.refresh === 'true';
      if (refresh) cache.delete(key);

      const data = await cachedGet({
        cache,
        key,
        ttl: TTL.mq,
        fetch: async () => {
          const result = await gtGateway.mqList(rig);
          return result.data ?? [];
        },
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Refinery status ---

  app.get('/api/refinery/:rig/status', async (req, res) => {
    try {
      const { rig } = req.params;
      const key = cacheKey('refinery:status', rig);
      const refresh = req.query.refresh === 'true';
      if (refresh) cache.delete(key);

      const data = await cachedGet({
        cache,
        key,
        ttl: TTL.refineryStatus,
        fetch: async () => {
          const result = await gtGateway.refineryStatus(rig);
          if (!result.ok && !result.data) throw new Error(result.error || 'Refinery status failed');
          return result.data ?? null;
        },
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Witness status ---

  app.get('/api/witness/:rig/status', async (req, res) => {
    try {
      const { rig } = req.params;
      const key = cacheKey('witness:status', rig);
      const refresh = req.query.refresh === 'true';
      if (refresh) cache.delete(key);

      const data = await cachedGet({
        cache,
        key,
        ttl: TTL.witnessStatus,
        fetch: async () => {
          const result = await gtGateway.witnessStatus(rig);
          if (!result.ok && !result.data) throw new Error(result.error || 'Witness status failed');
          return result.data ?? null;
        },
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Dolt health ---

  app.get('/api/dolt/health', async (req, res) => {
    try {
      const key = 'dolt:health';
      const refresh = req.query.refresh === 'true';
      if (refresh) cache.delete(key);

      const data = await cachedGet({
        cache,
        key,
        ttl: TTL.doltHealth,
        fetch: async () => {
          const result = await gtGateway.doltHealth();
          if (!result.ok && !result.data) throw new Error(result.error || 'Dolt health failed');
          return result.data ?? null;
        },
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Changelog ---

  app.get('/api/changelog', async (req, res) => {
    try {
      const { since, week, today, rig } = req.query;
      const key = cacheKey('changelog', since || '', week || '', today || '', rig || '');
      const refresh = req.query.refresh === 'true';
      if (refresh) cache.delete(key);

      const data = await cachedGet({
        cache,
        key,
        ttl: TTL.changelog,
        fetch: async () => {
          const result = await gtGateway.changelog({
            since,
            week: week === 'true',
            today: today === 'true',
            rig,
          });
          return result.data ?? [];
        },
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Rig list (structured, from gt rig list --json) ---

  app.get('/api/rig-list', async (req, res) => {
    try {
      const key = 'rig:list';
      const refresh = req.query.refresh === 'true';
      if (refresh) cache.delete(key);

      const data = await cachedGet({
        cache,
        key,
        ttl: TTL.rigList,
        fetch: async () => {
          const result = await gtGateway.rigList();
          return result.data ?? [];
        },
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
