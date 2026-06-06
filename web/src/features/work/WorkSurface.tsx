import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { Panel, Spinner, Button } from '@/components/primitives';
import { useConvoys } from '@/lib/query/hooks';
import type { Convoy } from '@/lib/api/types';
import { workTotals } from './workState';
import { WorkSummary } from './WorkSummary';
import { ConvoysPanel } from './ConvoysPanel';
import { DispatchDialog } from './DispatchDialog';

/**
 * Work & Convoys list view (/work). Clicking a convoy deep-links to /work/$id
 * — the URL changes, browser back returns here.
 */
export function WorkSurface() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useConvoys();
  const [dispatching, setDispatching] = useState(false);

  const onInspect = (convoy: Convoy) =>
    void navigate({ to: '/work/$convoyId', params: { convoyId: convoy.id } });

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
          onInspect={onInspect}
          onDispatch={() => setDispatching(true)}
        />
      </div>

      <DispatchDialog open={dispatching} onClose={() => setDispatching(false)} />
    </Surface>
  );
}
