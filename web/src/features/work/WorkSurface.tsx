import { useState } from 'react';
import { Surface } from '@/components/Surface';
import { Panel, Spinner, Button } from '@/components/primitives';
import { useConvoys } from '@/lib/query/hooks';
import type { Convoy } from '@/lib/api/types';
import { workTotals } from './workState';
import { WorkSummary } from './WorkSummary';
import { ConvoysPanel } from './ConvoysPanel';
import { ConvoyDetailDialog } from './ConvoyDetailDialog';
import { DispatchDialog } from './DispatchDialog';

/**
 * Work & Convoys — one surface, one job: see what work is in flight and steer
 * it. The convoy queue is the work queue (each convoy tracks dispatched beads);
 * "signal over noise" sorts blocked work to the top. Act: dispatch / inspect.
 */
export function WorkSurface() {
  const { data, isLoading, isError, error, refetch } = useConvoys();
  const [inspect, setInspect] = useState<Convoy | null>(null);
  const [dispatching, setDispatching] = useState(false);

  if (isLoading) {
    return (
      <Surface title="Work">
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
          <Spinner />
          Loading work queue…
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

  const convoys = data ?? [];

  return (
    <Surface
      title="Work"
      description="Active and queued convoys — what's in flight and who's on it."
      actions={
        <Button variant="primary" size="sm" onClick={() => setDispatching(true)}>
          Dispatch
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <WorkSummary totals={workTotals(convoys)} />
        <ConvoysPanel
          convoys={convoys}
          onInspect={setInspect}
          onDispatch={() => setDispatching(true)}
        />
      </div>

      <ConvoyDetailDialog convoy={inspect} onClose={() => setInspect(null)} />
      <DispatchDialog open={dispatching} onClose={() => setDispatching(false)} />
    </Surface>
  );
}
