import { Panel, PanelHeader, Table, StatusPill, Badge, type Column } from '@/components/primitives';
import type { Rig } from '@/lib/api/types';
import { pluralize } from '@/lib/utils/format';

function runningCount(rig: Rig): number {
  return (rig.agents ?? []).filter((a) => a.running).length;
}

const columns: Column<Rig>[] = [
  {
    key: 'name',
    header: 'Rig',
    width: '36%',
    cell: (rig) => <span className="font-mono text-sm text-fg">{rig.name}</span>,
  },
  {
    key: 'polecats',
    header: 'Polecats',
    align: 'right',
    cell: (rig) => <span className="font-mono tabular-nums text-fg">{rig.polecat_count}</span>,
  },
  {
    key: 'services',
    header: 'Services',
    cell: (rig) => (
      <div className="flex items-center gap-1.5">
        <Badge tone={rig.has_witness ? 'ok' : 'neutral'}>witness</Badge>
        <Badge tone={rig.has_refinery ? 'ok' : 'neutral'}>refinery</Badge>
      </div>
    ),
  },
  {
    key: 'live',
    header: 'Live',
    align: 'right',
    cell: (rig) => {
      const running = runningCount(rig);
      const total = (rig.agents ?? []).length;
      const tone = running > 0 ? 'ok' : 'neutral';
      return (
        <StatusPill
          tone={tone}
          pulse={running > 0}
          label={`${running}/${total}`}
          className="justify-end font-mono tabular-nums"
        />
      );
    },
  },
];

export function RigsPanel({ rigs }: { rigs: Rig[] }) {
  const sorted = [...rigs].sort((a, b) => b.polecat_count - a.polecat_count);
  return (
    <Panel flush>
      <PanelHeader
        title="Rigs"
        hint={pluralize(rigs.length, 'rig')}
      />
      <Table
        columns={columns}
        rows={sorted}
        rowKey={(r) => r.name}
        empty="No projects connected yet — go to Dispatch to ask the mayor to add one."
      />
    </Panel>
  );
}
