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
  constructor({ bdGateway, emit } = {}) {
    if (!bdGateway) throw new Error('BeadService requires bdGateway');
    if (!bdGateway.list) throw new Error('BeadService requires bdGateway.list()');
    if (!bdGateway.search) throw new Error('BeadService requires bdGateway.search()');
    if (!bdGateway.show) throw new Error('BeadService requires bdGateway.show()');
    if (!bdGateway.create) throw new Error('BeadService requires bdGateway.create()');

    this._bd = bdGateway;
    this._emit = emit ?? null;
  }

  async list({ status } = {}) {
    const result = await this._bd.list({ status });
    if (!result.ok || !Array.isArray(result.data)) return [];
    return result.data;
  }

  async search(query) {
    const result = await this._bd.search(query ?? '');
    if (!result.ok || !Array.isArray(result.data)) return [];
    return result.data;
  }

  async get(beadId) {
    const result = await this._bd.show(beadId);
    if (!result.ok) return { ok: false };
    return { ok: true, bead: result.data || { id: beadId } };
  }

  async graph() {
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

    return { ok: true, beadId, raw: result.raw };
  }
}

