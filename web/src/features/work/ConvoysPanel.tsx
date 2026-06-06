import {
  Panel,
  PanelHeader,
  Table,
  StatusPill,
  Button,
  type Column,
} from '@/components/primitives';
import type { Convoy } from '@/lib/api/types';
import { pluralize, relativeTime } from '@/lib/utils/format';
import { assignees, convoySignal, shortAgent, sortConvoys } from './workState';

/** Strip the "Work: " prefix convoys carry so the title leads with the job. */
function convoyTitle(raw: string): string {
  return raw.replace(/^Work:\s*/i, '').trim() || raw;
}

/** A flat hairline progress bar — accent fill, no glow. */
function Progress({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <div className="flex items-center justify-end gap-2 sm:justify-start">
      <span className="font-mono text-xs tabular-nums text-muted">
        {completed}/{total}
      </span>
      <span className="h-1 w-16 overflow-hidden rounded-sm bg-line" aria-hidden>
        <span
          className="block h-full bg-accent transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

function OnIt({ convoy }: { convoy: Convoy }) {
  const who = assignees(convoy.tracked);
  if (who.length === 0) return <span className="text-faint">—</span>;
  const [first, ...rest] = who;
  return (
    <span className="font-mono text-xs text-fg">
      {shortAgent(first)}
      {rest.length > 0 && <span className="text-faint"> +{rest.length}</span>}
    </span>
  );
}

const columns: Column<Convoy>[] = [
  {
    key: 'work',
    header: 'Work',
    primary: true,
    width: '46%',
    cell: (c) => (
      <div className="min-w-0">
        <div className="truncate text-sm text-fg">{convoyTitle(c.title)}</div>
        <div className="truncate font-mono text-2xs text-faint">
          {c.id}
          {c.created_at ? ` · ${relativeTime(c.created_at)}` : ''}
        </div>
      </div>
    ),
  },
  {
    key: 'progress',
    header: 'Progress',
    width: '18%',
    cell: (c) => <Progress completed={c.completed} total={c.total} />,
  },
  {
    key: 'onit',
    header: 'On it',
    width: '16%',
    className: 'truncate',
    cell: (c) => <OnIt convoy={c} />,
  },
  {
    key: 'state',
    header: 'State',
    width: '20%',
    align: 'right',
    cell: (c) => {
      const sig = convoySignal(c);
      return (
        <StatusPill
          tone={sig.tone}
          pulse={sig.pulse}
          label={sig.label}
          className="justify-end"
        />
      );
    },
  },
];

export function ConvoysPanel({
  convoys,
  onInspect,
  onDispatch,
}: {
  convoys: Convoy[];
  onInspect: (convoy: Convoy) => void;
  onDispatch: () => void;
}) {
  const sorted = sortConvoys(convoys);
  return (
    <Panel flush>
      <PanelHeader
        title="Convoys"
        hint={pluralize(convoys.length, 'convoy')}
        actions={
          <Button variant="primary" size="sm" onClick={onDispatch}>
            Dispatch
          </Button>
        }
      />
      <Table
        className="table-fixed"
        columns={columns}
        rows={sorted}
        rowKey={(c) => c.id}
        onRowClick={onInspect}
        empty="No active convoys — dispatch work to get started."
      />
    </Panel>
  );
}
