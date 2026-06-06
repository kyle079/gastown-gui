import { useCallback, useMemo, useState } from 'react';
import { Surface } from '@/components/Surface';
import { Badge, Button, Select, Spinner } from '@/components/primitives';
import { useBeadGraph } from '@/lib/query/hooks';
import type { BeadGraphNode } from '@/lib/api/types';
import { priorityLabel, priorityTone, statusLabel, statusTone } from '@/features/catalog/catalogMeta';
import { GraphCanvas } from './GraphCanvas';

const RIG_ALL = '__all__';
const STATUS_ALL = '__all__';

/**
 * Bead dependency graph surface. Desktop: full canvas with filters + detail panel.
 * Mobile (< md): falls back to a compact list of beads — the canvas isn't usable at 375px.
 */
export function BeadGraph() {
  const { data, isLoading, isError, error, refetch } = useBeadGraph();

  const [rigFilter, setRigFilter] = useState(RIG_ALL);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [selected, setSelected] = useState<BeadGraphNode | null>(null);
  const [focused, setFocused] = useState<Set<string> | undefined>(undefined);

  // Derive unique rigs from nodes.
  const rigs = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.nodes.map((n) => n.rig))].sort();
  }, [data]);

  // Filter graph data.
  const filtered = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    const nodes = data.nodes.filter(
      (n) =>
        (rigFilter === RIG_ALL || n.rig === rigFilter) &&
        (statusFilter === STATUS_ALL || n.status === statusFilter),
    );
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );
    return { nodes, edges };
  }, [data, rigFilter, statusFilter]);

  const handleNodeClick = useCallback((node: BeadGraphNode) => {
    setSelected(node);
    // Build the focus subgraph: this node + its direct neighbors.
    if (!data) return;
    const neighbors = new Set([node.id]);
    for (const e of data.edges) {
      if (e.source === node.id) neighbors.add(e.target);
      if (e.target === node.id) neighbors.add(e.source);
    }
    setFocused(neighbors);
  }, [data]);

  const clearFocus = useCallback(() => {
    setSelected(null);
    setFocused(undefined);
  }, []);

  const rigOptions = [
    { value: RIG_ALL, label: 'All rigs' },
    ...rigs.map((r) => ({ value: r, label: r })),
  ];

  const statusOptions = [
    { value: STATUS_ALL, label: 'All statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'hooked', label: 'Hooked' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <Surface
      title="Bead Graph"
      description="Interactive dependency graph — nodes are beads, edges are typed relationships."
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={rigFilter}
            onChange={(e) => { setRigFilter(e.target.value); clearFocus(); }}
            aria-label="Filter by rig"
          >
            {rigOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); clearFocus(); }}
            aria-label="Filter by status"
          >
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Button size="sm" variant="ghost" onClick={() => void refetch()} aria-label="Refresh">
            ↺
          </Button>
        </div>
      }
      className="flex h-full flex-col"
    >
      {isLoading && (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted">
          <Spinner />
          <span className="text-sm">Loading graph…</span>
        </div>
      )}

      {isError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-danger">
            {(error as Error)?.message ?? 'Failed to load graph'}
          </p>
          <Button size="sm" variant="default" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && filtered.nodes.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted">No beads match the current filters.</p>
        </div>
      )}

      {!isLoading && !isError && filtered.nodes.length > 0 && (
        <>
          {/* Desktop canvas */}
          <div
            className="hidden md:flex"
            style={{ height: 'calc(100vh - 180px)', minHeight: 400 }}
          >
            <div className="relative flex flex-1 overflow-hidden rounded border border-line">
              <GraphCanvas
                data={filtered}
                onNodeClick={handleNodeClick}
                focused={focused}
              />

              {/* Detail panel */}
              {selected && (
                <aside className="absolute right-0 top-0 h-full w-72 overflow-y-auto border-l border-line bg-surface/95 p-4 backdrop-blur-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-accent">{selected.id}</span>
                    <button
                      onClick={clearFocus}
                      className="text-faint hover:text-fg transition-colors text-sm"
                      aria-label="Close detail"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="mb-4 text-sm leading-snug text-fg">{selected.title}</p>

                  <div className="flex flex-col gap-2">
                    <Row label="Status">
                      <Badge tone={statusTone(selected.status)}>
                        {statusLabel(selected.status)}
                      </Badge>
                    </Row>
                    <Row label="Priority">
                      <Badge tone={priorityTone(selected.priority)}>
                        {priorityLabel(selected.priority)}
                      </Badge>
                    </Row>
                    <Row label="Type">
                      <span className="font-mono text-xs text-muted">
                        {selected.issue_type ?? '—'}
                      </span>
                    </Row>
                    <Row label="Rig">
                      <span className="font-mono text-xs text-muted">{selected.rig}</span>
                    </Row>
                  </div>

                  <div className="mt-4">
                    <p className="mb-1 font-mono text-2xs uppercase tracking-wider text-faint">
                      Neighbors highlighted
                    </p>
                    <p className="text-xs text-muted">
                      {focused ? `${focused.size} nodes in subgraph` : 'none'}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-4 w-full"
                    onClick={clearFocus}
                  >
                    Clear focus
                  </Button>
                </aside>
              )}
            </div>

            {/* Legend */}
            <div className="ml-3 flex w-32 shrink-0 flex-col gap-3 rounded border border-line bg-surface p-3">
              <p className="font-mono text-2xs uppercase tracking-wider text-faint">Legend</p>
              <div className="flex flex-col gap-1.5">
                <LegendEntry color="rgb(var(--c-warn))" label="blocks" dashed={false} />
                <LegendEntry color="rgb(var(--c-accent-dim))" label="parent-child" dashed={false} />
                <LegendEntry color="rgb(var(--c-faint))" label="discovered" dashed={false} />
              </div>
              <div className="mt-2 border-t border-line pt-2">
                <p className="font-mono text-2xs uppercase tracking-wider text-faint">Nodes</p>
                <p className="mt-1 font-mono text-2xs text-muted">
                  {filtered.nodes.length} beads · {filtered.edges.length} edges
                </p>
              </div>
            </div>
          </div>

          {/* Mobile fallback — compact list */}
          <div className="flex flex-col gap-1 md:hidden">
            <p className="mb-2 text-xs text-muted">
              Graph view is available on wider screens. Showing bead list.
            </p>
            {filtered.nodes.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-2 rounded border border-line bg-surface px-3 py-2"
              >
                <span className="font-mono text-2xs text-faint">{n.id}</span>
                <span className="flex-1 truncate text-xs text-fg">{n.title}</span>
                <Badge tone={statusTone(n.status)}>{statusLabel(n.status)}</Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </Surface>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line/60 py-1.5 last:border-0">
      <span className="font-mono text-2xs uppercase tracking-wider text-faint">{label}</span>
      {children}
    </div>
  );
}

function LegendEntry({ color, label }: { color: string; label: string; dashed: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-px w-6 shrink-0" style={{ background: color }} />
      <span className="font-mono text-2xs text-muted">{label}</span>
    </div>
  );
}
