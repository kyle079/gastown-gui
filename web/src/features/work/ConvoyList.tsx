import { Panel, PanelHeader, ListRow, StatusDot } from '@/components/primitives';
import type { Convoy } from '@/lib/api/types';
import { pluralize, relativeTime } from '@/lib/utils/format';
import { compareConvoys, convoySignal, convoyTitle } from './convoyQueue';

/**
 * The queue master list. Convoys needing the operator sort to the top (blocked,
 * then in-flight, then waiting, then done). Each row is a keyboard-drivable
 * button — Tab to a convoy, Enter to inspect.
 */
export function ConvoyList({
  convoys,
  selected,
  onSelect,
}: {
  convoys: Convoy[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = [...convoys].sort(compareConvoys);

  return (
    <Panel flush>
      <PanelHeader title="Queue" hint={pluralize(convoys.length, 'convoy')} />
      {sorted.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-faint">No convoys</div>
      ) : (
        <div className="divide-hairline">
          {sorted.map((convoy) => {
            const sig = convoySignal(convoy);
            const active = convoy.id === selected;
            return (
              <ListRow
                key={convoy.id}
                interactive
                active={active}
                onClick={() => onSelect(convoy.id)}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(convoy.id);
                  }
                }}
                leading={<StatusDot tone={sig.tone} pulse={sig.pulse} />}
                title={convoyTitle(convoy)}
                subtitle={
                  <span className="font-mono">
                    {convoy.id}
                    {convoy.created_at ? ` · ${relativeTime(convoy.created_at)}` : ''}
                  </span>
                }
                trailing={
                  <span className="font-mono tabular-nums text-muted">
                    {convoy.completed}/{convoy.total}
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
