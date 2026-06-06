import { useMemo, useState } from 'react';
import { Surface } from '@/components/Surface';
import { Button, Select, Spinner } from '@/components/primitives';
import { useBeadGraph } from '@/lib/query/hooks';
import { GraphCanvas } from './GraphCanvas';

const RIG_ALL = '__all__';
const STATUS_ALL = '__all__';

/**
 * Bead dependency graph surface. Renders the dependency canvas with pan/zoom
 * controls; node selection and deeper interactions belong to the next graph phase.
 */
export function BeadGraph() {
  const { data, isLoading, isError, error, refetch } = useBeadGraph();

  const [rigFilter, setRigFilter] = useState(RIG_ALL);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);

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
      description="Dependency graph canvas: nodes are beads, edges are typed relationships."
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={rigFilter}
            onChange={(e) => { setRigFilter(e.target.value); }}
            aria-label="Filter by rig"
          >
            {rigOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
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
          <div
            className="flex flex-col gap-3 md:flex-row"
            style={{ height: 'calc(100vh - 180px)', minHeight: 420 }}
          >
            <div className="relative flex flex-1 overflow-hidden rounded border border-line">
              <GraphCanvas data={filtered} />
            </div>

            <div className="flex shrink-0 flex-col gap-3 rounded border border-line bg-surface p-3 md:w-36">
              <p className="font-mono text-2xs uppercase tracking-wider text-faint">Legend</p>
              <div className="flex flex-col gap-1.5">
                <LegendEntry color="rgb(var(--c-warn))" label="blocks" />
                <LegendEntry color="rgb(var(--c-accent-dim))" label="parent-child" />
                <LegendEntry color="rgb(var(--c-faint))" label="discovered" />
              </div>
              <div className="mt-2 border-t border-line pt-2">
                <p className="font-mono text-2xs uppercase tracking-wider text-faint">Nodes</p>
                <p className="mt-1 font-mono text-2xs text-muted">
                  {filtered.nodes.length} beads · {filtered.edges.length} edges
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </Surface>
  );
}

function LegendEntry({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-px w-6 shrink-0" style={{ background: color }} />
      <span className="font-mono text-2xs text-muted">{label}</span>
    </div>
  );
}
