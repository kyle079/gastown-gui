import { Dialog, StatusPill, Badge, Select, useToast, type Tone } from '@/components/primitives';
import type { Convoy, TrackedBead } from '@/lib/api/types';
import { relativeTime } from '@/lib/utils/format';
import { useReassign, useTargets } from '@/lib/query/hooks';
import { convoySignal, shortAgent } from './workState';

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
  const { data: targets } = useTargets();
  const reassign = useReassign();
  const { notify } = useToast();

  function onReassign(target: string) {
    if (!target) return;
    reassign.mutate(
      { beadId: bead.id, target },
      {
        onSuccess: () => notify(`Reassigned ${bead.id} → ${shortAgent(target)}`, 'accent'),
        onError: () => notify(`Could not reassign ${bead.id}`, 'danger'),
      },
    );
  }

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
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
        <Select
          aria-label={`Reassign ${bead.id}`}
          value=""
          disabled={reassign.isPending}
          onChange={(e) => onReassign(e.target.value)}
          className="h-7 w-40 text-xs"
        >
          <option value="">Reassign…</option>
          {(targets ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
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
