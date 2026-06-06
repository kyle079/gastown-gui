import { useMemo, useState } from 'react';
import { Surface } from '@/components/Surface';
import { Panel, Spinner, Button } from '@/components/primitives';
import { useConvoys } from '@/lib/query/hooks';
import { compareConvoys, summarizeQueue } from './convoyQueue';
import { ConvoyList } from './ConvoyList';
import { ConvoyDetail } from './ConvoyDetail';
import { NewConvoyDialog } from './NewConvoyDialog';

/** Header line: "2 active · 1 blocked · 3 queued · 5 done" — only what's present. */
function describeQueue(summary: ReturnType<typeof summarizeQueue>): string {
  const parts: string[] = [];
  if (summary.blocked) parts.push(`${summary.blocked} blocked`);
  if (summary.active) parts.push(`${summary.active} active`);
  if (summary.queued) parts.push(`${summary.queued} queued`);
  if (summary.done) parts.push(`${summary.done} done`);
  return parts.join(' · ') || 'No convoys yet';
}

/**
 * Work — the convoy queue. One job: see what work is in flight, how far each
 * convoy has gotten, and who's on it; dispatch new work and inspect any convoy.
 * A queue list (severity-sorted) on the left, the selected convoy's detail on
 * the right; on a phone they stack, list first.
 */
export function Work() {
  const { data, isLoading, isError, error, refetch } = useConvoys();
  const [selected, setSelected] = useState<string | null>(null);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const convoys = useMemo(() => data ?? [], [data]);
  const summary = useMemo(() => summarizeQueue(convoys), [convoys]);

  // Default selection tracks whichever convoy most wants the operator, until the
  // operator picks one — resolved here (not in state) so it follows live data.
  const activeId = useMemo(() => {
    if (selected && convoys.some((c) => c.id === selected)) return selected;
    const top = [...convoys].sort(compareConvoys)[0];
    return top?.id ?? null;
  }, [selected, convoys]);

  const activeConvoy = convoys.find((c) => c.id === activeId) ?? null;

  const dispatchButton = (
    <Button variant="primary" size="sm" onClick={() => setDispatchOpen(true)}>
      Dispatch
    </Button>
  );

  if (isLoading) {
    return (
      <Surface title="Work">
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
          <Spinner />
          Loading queue…
        </Panel>
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface title="Work">
        <Panel className="flex flex-col items-center gap-4 py-16 text-center">
          <div>
            <p className="text-sm text-fg">Could not reach the gt bridge.</p>
            <p className="mt-1 font-mono text-xs text-faint">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </Panel>
      </Surface>
    );
  }

  return (
    <Surface title="Work" description={describeQueue(summary)} actions={dispatchButton}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ConvoyList convoys={convoys} selected={activeId} onSelect={setSelected} />
        </div>
        <div className="lg:col-span-2">
          {activeConvoy ? (
            <ConvoyDetail convoy={activeConvoy} />
          ) : (
            <Panel className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-sm text-faint">
                No convoys in the queue. Dispatch one to start tracking work.
              </p>
              {dispatchButton}
            </Panel>
          )}
        </div>
      </div>

      <NewConvoyDialog
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        onCreated={setSelected}
      />
    </Surface>
  );
}
