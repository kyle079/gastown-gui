import { useId, useMemo, useState } from 'react';
import { Badge, Button, Panel, PanelBody, PanelHeader } from '@/components/primitives';
import type { Tone } from '@/components/primitives';
import type { Convoy } from '@/lib/api/types';
import { pluralize } from '@/lib/utils/format';
import { ConvoyBoardCard } from './ConvoyBoardCard';
import {
  CONVOY_STATE_ORDER,
  type ConvoyState,
  groupConvoysByState,
} from './workState';

const laneMeta: Record<ConvoyState, { title: string; empty: string; tone: Tone }> = {
  blocked: {
    title: 'Blocked',
    empty: 'No blocked convoys.',
    tone: 'warn',
  },
  active: {
    title: 'Active',
    empty: 'No convoy is currently in flight.',
    tone: 'accent',
  },
  queued: {
    title: 'Queued',
    empty: 'No queued convoy work.',
    tone: 'neutral',
  },
  done: {
    title: 'Done',
    empty: 'No finished convoys yet.',
    tone: 'ok',
  },
};

const laneNarrative: Record<ConvoyState, string> = {
  blocked: 'Needs operator attention now.',
  active: 'In-flight work to monitor.',
  queued: 'Ready work waiting to start.',
  done: 'Completed convoys ready to review.',
};

function dominantMessage(state: ConvoyState, count: number): string {
  if (count === 0) return laneNarrative[state];
  if (state === 'blocked') return `${pluralize(count, 'convoy')} need intervention.`;
  if (state === 'active') return `${pluralize(count, 'convoy')} currently moving.`;
  if (state === 'queued') return `${pluralize(count, 'convoy')} ready to dispatch.`;
  return `${pluralize(count, 'convoy')} completed.`;
}

function LaneHeader({
  state,
  count,
  active = false,
  onSelect,
  panelId,
}: {
  state: ConvoyState;
  count: number;
  active?: boolean;
  onSelect?: (state: ConvoyState) => void;
  panelId?: string;
}) {
  const label = laneMeta[state].title;
  const inner = (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-faint">{label}</div>
        <div className="mt-1 text-sm text-muted">{dominantMessage(state, count)}</div>
      </div>
      <Badge tone={laneMeta[state].tone}>{count}</Badge>
    </div>
  );

  if (!onSelect) {
    return inner;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(state)}
      aria-pressed={active}
      aria-controls={panelId}
      className={`rounded-md border px-3 py-2 text-left transition-colors ${
        active ? 'border-accent/40 bg-accent/10' : 'border-line bg-surface hover:bg-raised'
      }`}
    >
      {inner}
    </button>
  );
}

function ConvoyLane({
  state,
  convoys,
  onInspect,
  id,
}: {
  state: ConvoyState;
  convoys: Convoy[];
  onInspect: (convoy: Convoy) => void;
  id?: string;
}) {
  return (
    <section id={id} className="flex min-h-[14rem] flex-col rounded-md border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <LaneHeader state={state} count={convoys.length} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        {convoys.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
            {laneMeta[state].empty}
          </div>
        ) : (
          convoys.map((convoy) => <ConvoyBoardCard key={convoy.id} convoy={convoy} onInspect={onInspect} />)
        )}
      </div>
    </section>
  );
}

export function ConvoyBoardPanel({
  convoys,
  onInspect,
  onDispatch,
}: {
  convoys: Convoy[];
  onInspect: (convoy: Convoy) => void;
  onDispatch: () => void;
}) {
  const lanePanelBaseId = useId();
  const grouped = useMemo(() => groupConvoysByState(convoys), [convoys]);
  const [mobileState, setMobileState] = useState<ConvoyState>('blocked');
  const selectedState =
    grouped[mobileState].length > 0
      ? mobileState
      : CONVOY_STATE_ORDER.find((state) => grouped[state].length > 0) ?? 'blocked';
  const summary = CONVOY_STATE_ORDER.map((state) => ({
    state,
    count: grouped[state].length,
  }));

  return (
    <Panel flush>
      <PanelHeader
        title="Convoy board"
        hint={pluralize(convoys.length, 'convoy')}
        actions={
          <Button variant="primary" size="sm" onClick={onDispatch}>
            Dispatch
          </Button>
        }
      />

      <PanelBody className="flex flex-col gap-4 border-b border-line">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map(({ state, count }) => (
            <div
              key={state}
              className="rounded-md border border-line bg-surface-alt px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wider text-faint">{laneMeta[state].title}</span>
                <Badge tone={laneMeta[state].tone}>{count}</Badge>
              </div>
              <div className="mt-2 text-sm text-muted">{dominantMessage(state, count)}</div>
            </div>
          ))}
        </div>
      </PanelBody>

      <PanelBody className="flex flex-col gap-4 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-fg">Mobile status mode</div>
            <div className="text-xs text-muted">Sweep one lane at a time without losing the board signal.</div>
          </div>
          <Badge tone={laneMeta[selectedState].tone}>{laneMeta[selectedState].title}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {CONVOY_STATE_ORDER.map((state) => (
            <LaneHeader
              key={state}
              state={state}
              count={grouped[state].length}
              active={selectedState === state}
              onSelect={setMobileState}
              panelId={`${lanePanelBaseId}-${state}`}
            />
          ))}
        </div>

        <ConvoyLane
          id={`${lanePanelBaseId}-${selectedState}`}
          state={selectedState}
          convoys={grouped[selectedState]}
          onInspect={onInspect}
        />
      </PanelBody>

      <PanelBody className="hidden md:block">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="flex flex-col gap-4">
            <ConvoyLane state="blocked" convoys={grouped.blocked} onInspect={onInspect} />
            <ConvoyLane state="queued" convoys={grouped.queued} onInspect={onInspect} />
          </div>
          <div className="flex flex-col gap-4">
            <ConvoyLane state="active" convoys={grouped.active} onInspect={onInspect} />
            <ConvoyLane state="done" convoys={grouped.done} onInspect={onInspect} />
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
