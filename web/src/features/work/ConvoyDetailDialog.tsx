import { useState } from 'react';
import { Badge, Button, Dialog, StatusPill, type Tone } from '@/components/primitives';
import type { Convoy, TrackedBead } from '@/lib/api/types';
import { relativeTime } from '@/lib/utils/format';
import { convoySignal, shortAgent } from './workState';
import { TrackedBeadActionDialog, type TrackedBeadAction } from './TrackedBeadActionDialog';

/** Map a tracked bead's status to a calm tone for its badge. */
function beadTone(b: TrackedBead): Tone {
  if (b.blocked) return 'warn';
  switch (String(b.status)) {
    case 'closed':
      return 'ok';
    case 'hooked':
    case 'in_progress':
    case 'working':
      return 'accent';
    default:
      return 'neutral';
  }
}

function TrackedRow({ bead }: { bead: TrackedBead }) {
  const [action, setAction] = useState<TrackedBeadAction | null>(null);

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm text-fg">{bead.title}</div>
          <div className="font-mono text-2xs text-faint">{bead.id}</div>
        </div>
        <Badge tone={beadTone(bead)}>{bead.blocked ? 'blocked' : String(bead.status)}</Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted">
          {bead.assignee ? shortAgent(bead.assignee) : 'unassigned'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => setAction('reassign')}>
          Reassign
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAction('park')}>
          Park
        </Button>
        <Button size="sm" variant="primary" onClick={() => setAction('done')}>
          Done
        </Button>
        <Button size="sm" variant="danger" onClick={() => setAction('release')}>
          Release
        </Button>
      </div>

      <TrackedBeadActionDialog
        bead={bead}
        action={action}
        open={action != null}
        onClose={() => setAction(null)}
      />
    </div>
  );
}

export function ConvoyDetailDialog({
  convoy,
  onClose,
}: {
  convoy: Convoy | null;
  onClose: () => void;
}) {
  if (!convoy) return null;
  const sig = convoySignal(convoy);
  const tracked = convoy.tracked ?? [];

  return (
    <Dialog
      open
      onClose={onClose}
      title={convoy.title.replace(/^Work:\s*/i, '').trim() || convoy.title}
      description={`${convoy.id}${convoy.created_at ? ` · ${relativeTime(convoy.created_at)}` : ''}`}
      className="sm:max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <StatusPill tone={sig.tone} pulse={sig.pulse} label={sig.label} />
          <span className="font-mono text-xs tabular-nums text-muted">
            {convoy.completed}/{convoy.total} done
          </span>
        </div>

        <div className="-mx-4 -mb-4 divide-y divide-line border-t border-line">
          {tracked.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-faint">No tracked beads.</div>
          ) : (
            tracked.map((b) => <TrackedRow key={b.id} bead={b} />)
          )}
        </div>
      </div>
    </Dialog>
  );
}
