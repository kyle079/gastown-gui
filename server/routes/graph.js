const STATUSES = ['open', 'in_progress', 'hooked', 'blocked', 'deferred', 'closed', 'pinned'];

/**
 * Fetch all beads across all statuses and combine into a flat list.
 * bd list only returns one status at a time (or the default open+hooked).
 */
async function fetchAllBeads(bdGateway) {
  const results = await Promise.all(
    STATUSES.map((s) => bdGateway.list({ status: s })),
  );

  const seen = new Set();
  const beads = [];
  for (const r of results) {
    if (!r.ok || !Array.isArray(r.data)) continue;
    for (const b of r.data) {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        beads.push(b);
      }
    }
  }
  return beads;
}

/**
 * Build graph data from a flat list of beads.
 * Each bead becomes a node; each dependency entry becomes a directed edge.
 */
function buildGraph(beads) {
  const nodes = beads.map((b) => ({
    id: b.id,
    title: b.title,
    status: b.status,
    priority: b.priority ?? null,
    issue_type: b.issue_type ?? null,
    owner: b.owner ?? null,
    assignee: b.assignee ?? null,
    description: b.description ?? null,
    created_at: b.created_at ?? null,
    updated_at: b.updated_at ?? null,
    rig: rigFromId(b.id),
  }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeKeys = new Set();
  const edges = [];

  for (const b of beads) {
    const deps = b.dependencies;
    if (!Array.isArray(deps)) continue;
    for (const dep of deps) {
      const type = dep.type ?? 'related';
      // Two formats observed:
      //   { issue_id, depends_on_id, type }  — from bd list
      //   { id, title, dependency_type }     — from bd show (inline dep object)
      let source, target;
      if (dep.depends_on_id) {
        // bd list format: issue_id depends_on depends_on_id
        // "blocks" means depends_on_id blocks issue_id → edge: depends_on → issue
        source = dep.depends_on_id;
        target = dep.issue_id ?? b.id;
      } else if (dep.id) {
        // bd show format: dep.id is the dependency, b.id is the current bead
        source = dep.id;
        target = b.id;
      } else {
        continue;
      }

      // Only emit edges where both endpoints are in our node set.
      if (!nodeIds.has(source) || !nodeIds.has(target)) continue;
      if (source === target) continue;

      const key = `${source}→${target}:${type}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);

      edges.push({
        id: key,
        source,
        target,
        type,
      });
    }
  }

  return { nodes, edges };
}

/** Extract rig prefix from a bead ID (e.g. "gg-dny" → "gg", "hq-cv-foo" → "hq"). */
function rigFromId(id) {
  if (!id) return null;
  const m = id.match(/^([a-z]+)-/);
  return m ? m[1] : null;
}

export function registerGraphRoutes(app, { bdGateway } = {}) {
  if (!bdGateway) throw new Error('registerGraphRoutes requires bdGateway');

  app.get('/api/beads/graph', async (req, res) => {
    try {
      const beads = await fetchAllBeads(bdGateway);
      const graph = buildGraph(beads);
      res.json(graph);
    } catch (err) {
      console.error('[API] Failed to build bead graph:', err);
      res.status(500).json({ error: err.message || 'Failed to build bead graph' });
    }
  });
}
