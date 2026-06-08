import { Link } from '@tanstack/react-router';
import { Panel, PanelHeader, ListRow, StatusDot } from '@/components/primitives';
import type { Rig } from '@/lib/api/types';
import { pluralize } from '@/lib/utils/format';
import { rigHealth, compareRigs } from './rigHealth';

function counts(rig: Rig): string {
  const parts = [pluralize(rig.polecat_count, 'polecat')];
  if (rig.crew_count > 0) parts.push(pluralize(rig.crew_count, 'crew', 'crew'));
  return parts.join(' · ');
}

/**
 * The fleet master list. Rigs needing the operator sort to the top (severity
 * first). Each row is a selectable button so the whole list is keyboard-drivable
 * — Tab to a rig, Enter to drill in.
 */
export function RigList({
  rigs,
  selected,
  onSelect,
}: {
  rigs: Rig[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const sorted = [...rigs].sort(compareRigs);

  return (
    <Panel flush>
      <PanelHeader title="Fleet" hint={pluralize(rigs.length, 'rig')} />
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <p className="text-sm text-faint">No projects connected yet.</p>
          <Link to="/dispatch" className="text-xs text-accent hover:underline underline-offset-2">
            Go to Dispatch to ask the mayor to add one →
          </Link>
        </div>
      ) : (
        <div className="divide-hairline">
          {sorted.map((rig) => {
            const health = rigHealth(rig);
            const active = rig.name === selected;
            return (
              <ListRow
                key={rig.name}
                interactive
                active={active}
                onClick={() => onSelect(rig.name)}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(rig.name);
                  }
                }}
                leading={<StatusDot tone={health.tone} pulse={health.pulse} />}
                title={<span className="font-mono">{rig.name}</span>}
                subtitle={counts(rig)}
                trailing={
                  <span className="font-mono tabular-nums text-muted">
                    {health.running}/{health.total}
                  </span>
                }
              />
            );
          })}
        </div>
      )}
    </Panel>
  );
}
