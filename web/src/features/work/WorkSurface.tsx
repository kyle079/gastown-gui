import { useNavigate } from '@tanstack/react-router';
import { Panel, Spinner, Button } from '@/components/primitives';
import { useBeads, useConvoys, useSchedulerStatus } from '@/lib/query/hooks';
import type { Convoy } from '@/lib/api/types';
import { workTotals } from './workState';
import { WorkSummary } from './WorkSummary';
import { ConvoysPanel } from './ConvoysPanel';
import { WorkAttentionPanel } from './WorkAttentionPanel';
import { NextActionsPanel } from './NextActionsPanel';
import { BeadQueuePanel } from './BeadQueuePanel';
import { collectNextActions, collectWorkAttention, triageBeads } from './triageModel';

/**
 * Work tracking content: convoy board, bead queue, attention/next-action panels.
 * Rendered inside DispatchSurface's "Track" tab — no dispatch UI here.
 */
export function WorkSurface() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useConvoys();
  const beadsQuery = useBeads('all');
  const schedulerQuery = useSchedulerStatus();

  const onInspect = (convoy: Convoy) =>
    void navigate({ to: '/dispatch/$convoyId', params: { convoyId: convoy.id } });

  if (isLoading) {
    return (
      <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
        <Spinner />
        Loading work queue…
      </Panel>
    );
  }

  if (isError || !data) {
    return (
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
    );
  }

  const convoys = data ?? [];
  const beads = beadsQuery.data ?? [];
  const attention = collectWorkAttention(convoys, beads, schedulerQuery.data);
  const nextActions = collectNextActions(convoys, beads, schedulerQuery.data);
  const queue = triageBeads(beads);
  const attentionItems = [
    ...(beadsQuery.isError || schedulerQuery.isError
      ? [
          {
            id: 'partial-data',
            tone: 'warn' as const,
            title: 'Partial triage data',
            detail: 'Beads or scheduler status is unavailable, so this board is operating with reduced signal.',
          },
        ]
      : []),
    ...attention,
  ];

  return (
    <div className="flex flex-col gap-4">
      <WorkSummary totals={workTotals(convoys)} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.45fr]">
        <div className="flex flex-col gap-4">
          <WorkAttentionPanel items={attentionItems} />
          <NextActionsPanel actions={nextActions} />
        </div>
        <ConvoysPanel convoys={convoys} onInspect={onInspect} />
      </div>
      <BeadQueuePanel beads={queue} isLoading={beadsQuery.isLoading} isError={beadsQuery.isError} />
    </div>
  );
}
