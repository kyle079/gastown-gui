import { Badge, ListRow, Panel, PanelHeader, StatusDot } from '@/components/primitives';
import type { Bead } from '@/lib/api/types';
import { pluralize, relativeTime } from '@/lib/utils/format';
import { priorityLabel, priorityTone, statusLabel, statusTone } from '@/features/catalog/catalogMeta';

export function BeadQueuePanel({
  beads,
  isLoading = false,
  isError = false,
}: {
  beads: Bead[];
  isLoading?: boolean;
  isError?: boolean;
}) {
  return (
    <Panel flush>
      <PanelHeader title="Bead queue" hint={pluralize(beads.length, 'bead')} />
      {isLoading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
          <StatusDot tone="info" pulse />
          Loading bead queue…
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
          <StatusDot tone="warn" />
          Bead queue unavailable.
        </div>
      ) : beads.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
          <StatusDot tone="ok" />
          No open bead queue right now.
        </div>
      ) : (
        <div className="divide-hairline">
          {beads.map((bead) => (
            <ListRow
              key={bead.id}
              leading={<Badge tone={priorityTone(bead.priority)}>{priorityLabel(bead.priority)}</Badge>}
              title={bead.title}
              subtitle={
                <span className="font-mono text-2xs">
                  {bead.id}
                  {bead.issue_type ? ` · ${bead.issue_type}` : ''}
                  {bead.updated_at ? ` · ${relativeTime(bead.updated_at)}` : ''}
                </span>
              }
              trailing={<Badge tone={statusTone(bead.status)}>{statusLabel(bead.status)}</Badge>}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
