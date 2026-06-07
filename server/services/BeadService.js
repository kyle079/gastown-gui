const PRIORITY_MAP = {
  urgent: 'P0',
  critical: 'P0',
  high: 'P1',
  normal: 'P2',
  low: 'P3',
  backlog: 'P4',
};

function normalizeLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels.filter((label) => typeof label === 'string' && label.trim().length > 0);
}

export class BeadService {
  constructor({ bdGateway, beadsReadGateway, cache, emit } = {}) {
    if (!bdGateway) throw new Error('BeadService requires bdGateway');
    if (!bdGateway.list) throw new Error('BeadService requires bdGateway.list()');
    if (!bdGateway.search) throw new Error('BeadService requires bdGateway.search()');
    if (!bdGateway.show) throw new Error('BeadService requires bdGateway.show()');
    if (!bdGateway.create) throw new Error('BeadService requires bdGateway.create()');
    if (!bdGateway.update) throw new Error('BeadService requires bdGateway.update()');

    this._bd = bdGateway;
    this._reads = beadsReadGateway ?? null;
    this._cache = cache ?? null;
    this._emit = emit ?? null;
  }

  async list({ status } = {}) {
    const key = `beads:list:${status || 'all'}`;
    return this._getCached(key, async () => {
      if (this._reads?.list) {
        try {
          return await this._reads.list({ status });
        } catch {
          // Fall back to bd CLI reads if Dolt access is unavailable.
        }
      }

      const result = await this._bd.list({ status });
      if (!result.ok || !Array.isArray(result.data)) return [];
      return result.data;
    });
  }

  async search(query) {
    const normalized = String(query ?? '').trim();
    return this._getCached(`beads:search:${normalized}`, async () => {
      if (this._reads?.search) {
        try {
          return await this._reads.search(normalized);
        } catch {
          // Fall back to bd CLI reads if Dolt access is unavailable.
        }
      }

      const result = await this._bd.search(normalized);
      if (!result.ok || !Array.isArray(result.data)) return [];
      return result.data;
    });
  }

  async get(beadId) {
    const bead = await this._getCached(`beads:get:${beadId}`, async () => {
      if (this._reads?.get) {
        try {
          return await this._reads.get(beadId);
        } catch {
          // Fall back to bd CLI reads if Dolt access is unavailable.
        }
      }

      const result = await this._bd.show(beadId);
      if (!result.ok) return null;
      return Array.isArray(result.data) ? result.data[0] : result.data;
    });

    if (!bead) return { ok: false };
    return { ok: true, bead: bead || { id: beadId } };
  }

  async graph() {
    return this._getCached('beads:graph', async () => {
      if (this._reads?.graph) {
        try {
          return await this._reads.graph();
        } catch {
          // Fall back to bd CLI reads if Dolt access is unavailable.
        }
      }

      const result = await this._bd.listAll();
      if (!result.ok || !Array.isArray(result.data)) return { nodes: [], edges: [] };

      const beads = result.data;
      const nodes = beads.map((b) => ({
        id: b.id,
        title: b.title,
        status: b.status,
        priority: b.priority,
        issue_type: b.issue_type,
        rig: b.id.split('-')[0],
      }));

      const edgeSet = new Set();
      const edges = [];
      for (const b of beads) {
        for (const dep of b.dependencies ?? []) {
          const src = dep.depends_on_id;
          const tgt = dep.issue_id;
          const type = dep.type || 'blocks';
          if (!src || !tgt) continue;
          const key = `${src}→${tgt}:${type}`;
          if (edgeSet.has(key)) continue;
          edgeSet.add(key);
          edges.push({ id: key, source: src, target: tgt, type });
        }
      }

      return { nodes, edges };
    });
  }

  async create({ title, description, priority, labels } = {}) {
    if (!title) return { ok: false, statusCode: 400, error: 'Title is required' };

    const normalizedPriority = priority ? PRIORITY_MAP[String(priority).toLowerCase()] || String(priority) : null;
    const normalizedLabels = normalizeLabels(labels);

    const result = await this._bd.create({
      title,
      description,
      priority: normalizedPriority && normalizedPriority !== 'P2' ? normalizedPriority : null,
      labels: normalizedLabels,
    });

    if (!result.ok) return { ok: false, statusCode: 500, error: result.error || 'Failed to create bead' };

    const beadId = result.beadId || null;
    if (beadId) {
      this._emit?.('bead_created', { bead_id: beadId, title });
    }
    this._invalidateReadCaches();

    return { ok: true, beadId, raw: result.raw };
  }

  async update({ beadId, title, description, priority, status, assignee, labels } = {}) {
    if (!beadId) return { ok: false, statusCode: 400, error: 'Bead ID is required' };

    const normalizedPriority = priority
      ? PRIORITY_MAP[String(priority).toLowerCase()] || String(priority)
      : null;
    const normalizedLabels = Array.isArray(labels) ? normalizeLabels(labels) : undefined;

    const result = await this._bd.update({
      beadId,
      title,
      description,
      priority: normalizedPriority,
      status,
      assignee,
      labels: normalizedLabels,
    });

    if (!result.ok) return { ok: false, statusCode: 500, error: result.error || 'Failed to update bead' };

    this._emit?.('bead_updated', { bead_id: beadId, title, status, assignee });
    this._invalidateReadCaches();
    return { ok: true, raw: result.raw };
  }

  _getCached(key, loader, ttlMs = 10_000) {
    if (!this._cache?.getOrExecute) return loader();
    return this._cache.getOrExecute(key, loader, ttlMs);
  }

  _invalidateReadCaches() {
    this._cache?.deleteByPrefix?.('beads:');
  }
}
