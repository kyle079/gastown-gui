import { useMemo, useState } from 'react';
import { Badge, Panel, PanelBody, PanelHeader } from '@/components/primitives';
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
    empty: 'No blocked convoys — nothing needs attention here.',
    tone: 'warn',
  },
  active: {
    title: 'Active',
    empty: 'No convoys in flight. Use Dispatch to start new work.',
    tone: 'accent',
  },
  queued: {
    title: 'Queued',
    empty: 'Nothing queued. Dispatch work to fill this lane.',
    tone: 'neutral',
  },
  done: {
    title: 'Done',
    empty: 'Nothing finished yet. Check Landing once work merges.',
    tone: 'ok',
  },
};

function LaneHeader({
  state,
  count,
  active = false,
  onSelect,
}: {
  state: ConvoyState;
  count: number;
  active?: boolean;
  onSelect?: (state: ConvoyState) => void;
}) {
  const label = laneMeta[state].title;
  const inner = (
    <>
      <span className="text-xs uppercase tracking-wider text-faint">{label}</span>
      <Badge tone={laneMeta[state].tone}>{count}</Badge>
    </>
  );

  if (!onSelect) {
    return <div className="flex items-center justify-between gap-2">{inner}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(state)}
      className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
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
}: {
  state: ConvoyState;
  convoys: Convoy[];
  onInspect: (convoy: Convoy) => void;
}) {
  return (
    <div className="flex min-h-[14rem] flex-col rounded-md border border-line bg-surface">
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
    </div>
  );
}

export function ConvoyBoardPanel({
  convoys,
  onInspect,
}: {
  convoys: Convoy[];
  onInspect: (convoy: Convoy) => void;
}) {
  const grouped = useMemo(() => groupConvoysByState(convoys), [convoys]);
  const [mobileState, setMobileState] = useState<ConvoyState>('blocked');
  const selectedState =
    grouped[mobileState].length > 0
      ? mobileState
      : CONVOY_STATE_ORDER.find((state) => grouped[state].length > 0) ?? 'blocked';

  return (
    <Panel flush>
      <PanelHeader
        title="Convoy board"
        hint={pluralize(convoys.length, 'convoy')}
      />

      <PanelBody className="flex flex-col gap-4 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-fg">Mobile status mode</div>
            <div className="text-xs text-muted">Focus one convoy lane at a time.</div>
          </div>
          <Badge tone="info">{laneMeta[selectedState].title}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {CONVOY_STATE_ORDER.map((state) => (
            <LaneHeader
              key={state}
              state={state}
              count={grouped[state].length}
              active={selectedState === state}
              onSelect={setMobileState}
            />
          ))}
        </div>

        <ConvoyLane state={selectedState} convoys={grouped[selectedState]} onInspect={onInspect} />
      </PanelBody>

      <PanelBody className="hidden md:block">
        <div className="grid gap-4 xl:grid-cols-2">
          {CONVOY_STATE_ORDER.map((state) => (
            <ConvoyLane key={state} state={state} convoys={grouped[state]} onInspect={onInspect} />
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}
