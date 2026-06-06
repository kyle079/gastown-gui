import { useNavigate, useParams } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { Panel, Spinner, Button, StatusPill, Badge, Select, useToast, type Tone } from '@/components/primitives';
import { useConvoys, useReassign, useTargets } from '@/lib/query/hooks';
import type { TrackedBead, Convoy } from '@/lib/api/types';
import { relativeTime } from '@/lib/utils/format';
import { convoySignal, shortAgent } from './workState';

function beadTone(b: TrackedBead): Tone {
  if (b.blocked) return 'warn';
  switch (String(b.status)) {
    case 'closed': return 'ok';
    case 'hooked':
    case 'in_progress':
    case 'working': return 'accent';
    default: return 'neutral';
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

function ConvoyDetail({ convoy }: { convoy: Convoy }) {
  const sig = convoySignal(convoy);
  const tracked = convoy.tracked ?? [];
  const title = convoy.title.replace(/^Work:\s*/i, '').trim() || convoy.title;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-fg truncate">{title}</h2>
            <p className="font-mono text-xs text-faint mt-0.5">
              {convoy.id}
              {convoy.created_at ? ` · ${relativeTime(convoy.created_at)}` : ''}
            </p>
          </div>
          <StatusPill tone={sig.tone} pulse={sig.pulse} label={sig.label} />
        </div>
        <div className="pt-3 flex items-center justify-end">
          <span className="font-mono text-xs tabular-nums text-muted">
            {convoy.completed}/{convoy.total} done
          </span>
        </div>
      </Panel>

      <Panel flush>
        <div className="divide-y divide-line border-t border-line">
          {tracked.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-faint">No tracked beads.</div>
          ) : (
            tracked.map((b) => <TrackedRow key={b.id} bead={b} />)
          )}
        </div>
      </Panel>
    </div>
  );
}

/**
 * Full-page routed convoy detail view.
 * URL: /work/$convoyId — deep-linkable, browser back returns to /work.
 */
export function ConvoyDetailPage() {
  const { convoyId } = useParams({ strict: false }) as { convoyId: string };
  const navigate = useNavigate();
  const { data, isLoading, isError } = useConvoys();

  const back = () => void navigate({ to: '/work' });

  if (isLoading) {
    return (
      <Surface
        title="Convoy"
        actions={<Button variant="ghost" size="sm" onClick={back}>← Back</Button>}
      >
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
          <Spinner />
          Loading convoy…
        </Panel>
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface
        title="Convoy"
        actions={<Button variant="ghost" size="sm" onClick={back}>← Back</Button>}
      >
        <Panel className="py-16 text-center text-sm text-faint">
          Could not load convoy data.
        </Panel>
      </Surface>
    );
  }

  const convoy = data.find((c) => c.id === convoyId);
  if (!convoy) {
    return (
      <Surface
        title="Convoy"
        actions={<Button variant="ghost" size="sm" onClick={back}>← Back</Button>}
      >
        <Panel className="py-16 text-center text-sm text-faint">
          Convoy not found: <span className="font-mono">{convoyId}</span>
        </Panel>
      </Surface>
    );
  }

  const title = convoy.title.replace(/^Work:\s*/i, '').trim() || convoy.title;

  return (
    <Surface
      title={title}
      description={`${convoy.id}${convoy.created_at ? ` · ${relativeTime(convoy.created_at)}` : ''}`}
      actions={<Button variant="ghost" size="sm" onClick={back}>← Back</Button>}
    >
      <ConvoyDetail convoy={convoy} />
    </Surface>
  );
}
