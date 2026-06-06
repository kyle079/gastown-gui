import { Badge, Spinner } from '@/components/primitives';
import { priorityLabel, priorityTone, statusLabel, statusTone } from '@/features/catalog/catalogMeta';
import { useBeadGraph } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';
import { BeadGraph } from './BeadGraph';

/**
 * Graph surface — full interactive node-graph on desktop (lg+),
 * a dense list fallback on mobile (< lg) where a canvas graph isn't usable.
 */
export function GraphSurface() {
  return (
    <>
      {/* Desktop: full graph */}
      <div className="hidden h-full lg:flex lg:flex-col">
        <div className="border-b border-line bg-surface px-4 py-3">
          <h1 className="text-sm font-medium text-fg">Bead Graph</h1>
          <p className="mt-0.5 font-mono text-xs text-faint">
            Dependency graph of all beads. Double-click a node to focus its subgraph.
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          <BeadGraph />
        </div>
      </div>

      {/* Mobile: list fallback */}
      <div className="lg:hidden">
        <MobileGraphFallback />
      </div>
    </>
  );
}

function MobileGraphFallback() {
  const { data, isLoading, isError } = useBeadGraph();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-2 text-sm text-muted">Loading…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-4 py-8">
        <p className="text-sm text-danger">Failed to load bead graph.</p>
      </div>
    );
  }

  const sorted = [...data.nodes].sort((a, b) => {
    const pa = a.priority ?? 99;
    const pb = b.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
  });

  return (
    <div className="flex flex-col">
      <div className="border-b border-line bg-surface px-4 py-3">
        <h1 className="text-sm font-medium text-fg">Bead Graph</h1>
        <p className="mt-0.5 font-mono text-xs text-faint">
          {sorted.length} beads · {data.edges.length} relationships
        </p>
      </div>
      <div className="divide-y divide-line">
        {sorted.map((n) => (
          <div key={n.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-faint">{n.id}</span>
              <Badge tone={statusTone(n.status)} className="ml-auto">
                {statusLabel(n.status)}
              </Badge>
              <Badge tone={priorityTone(n.priority ?? undefined)}>
                {priorityLabel(n.priority ?? undefined)}
              </Badge>
            </div>
            <p className="text-sm text-fg leading-snug">{n.title}</p>
            <span className="font-mono text-xs text-faint">{relativeTime(n.updated_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
