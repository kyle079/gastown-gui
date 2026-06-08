import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { Panel, PanelHeader, Spinner, Button, StatusPill, Badge, Select, useToast, type Tone } from '@/components/primitives';
import { useConvoys, useReassign, useStatus, useTargets } from '@/lib/query/hooks';
import type { TrackedBead, Convoy } from '@/lib/api/types';
import { relativeTime } from '@/lib/utils/format';
import { convoySignal, shortAgent, trackedBeadState } from './workState';
import { ActionHubPanel } from './ActionHubPanel';
import { buildConvoyHub } from './detailHubModel';

function rigFromAddress(value?: string | null): string | null {
  if (!value) return null;
  const [rig] = value.split('/');
  return rig || null;
}

function beadTone(b: TrackedBead): Tone {
  switch (trackedBeadState(b)) {
    case 'blocked': return 'warn';
    case 'done': return 'ok';
    case 'active': return 'accent';
    default: return 'neutral';
  }
}

function beadLabel(bead: TrackedBead): string {
  return trackedBeadState(bead) === 'blocked' ? 'blocked' : String(bead.status);
}

function TrackedRow({ bead }: { bead: TrackedBead }) {
  const { data: targets } = useTargets();
  const reassign = useReassign();
  const { notify } = useToast();
  const rig = rigFromAddress(bead.assignee);

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
          <div className="break-words text-sm text-fg">{bead.title}</div>
          <div className="font-mono text-2xs text-faint">{bead.id}</div>
        </div>
        <Badge tone={beadTone(bead)}>{beadLabel(bead)}</Badge>
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
        <Link
          to="/investigate"
          search={{ mode: 'issues' as const, id: bead.id, status: 'all' }}
          className="font-mono text-accent underline-offset-2 hover:underline"
        >
          Open bead
        </Link>
        {rig && (
          <Link
            to="/fleet/$rig"
            params={{ rig }}
            className="font-mono text-accent underline-offset-2 hover:underline"
          >
            Inspect rig
          </Link>
        )}
      </div>
    </div>
  );
}

function ConvoyDetail({ convoy }: { convoy: Convoy }) {
  const sig = convoySignal(convoy);
  const tracked = convoy.tracked ?? [];
  const title = convoy.title.replace(/^Work:\s*/i, '').trim() || convoy.title;
  const statusQuery = useStatus();
  const hub = buildConvoyHub(convoy, statusQuery.data?.agents ?? []);

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-fg break-words">{title}</h2>
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

      <ActionHubPanel actions={hub.actions} title="Next operator moves" />

      <Panel>
        <PanelHeader title="Related state" hint="convoy context" />
        <div className="grid gap-4 pt-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded border border-line/80 bg-base px-3 py-2">
              <div className="font-mono text-2xs text-faint">Blocked</div>
              <div className="mt-1 text-lg text-fg">{hub.blocked.length}</div>
            </div>
            <div className="rounded border border-line/80 bg-base px-3 py-2">
              <div className="font-mono text-2xs text-faint">Active</div>
              <div className="mt-1 text-lg text-fg">{hub.active.length}</div>
            </div>
            <div className="rounded border border-line/80 bg-base px-3 py-2">
              <div className="font-mono text-2xs text-faint">Queued</div>
              <div className="mt-1 text-lg text-fg">{hub.queued.length}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {hub.operators.length > 0 ? (
              hub.operators.map((operator) => {
                const rig = rigFromAddress(operator.address);
                return (
                  <div key={operator.address} className="rounded border border-line/80 bg-base px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      {rig ? (
                        <Link
                          to="/fleet/$rig"
                          params={{ rig }}
                          className="font-mono text-xs text-accent underline-offset-2 hover:underline"
                        >
                          {operator.address}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-fg">{operator.address}</span>
                      )}
                      <Badge tone={operator.running ? 'accent' : 'danger'}>
                        {operator.running ? operator.state : 'offline'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {operator.hook_bead ? `hooked on ${operator.hook_bead}` : 'No hooked bead reported.'}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded border border-dashed border-line/80 px-3 py-3 text-sm text-faint">
                No live operator runtime is linked to this convoy right now.
              </div>
            )}

            {statusQuery.isError && (
              <p className="text-xs text-faint">
                Runtime status is temporarily unavailable; convoy composition is still shown from tracked work.
              </p>
            )}
          </div>
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

  const back = () => void navigate({ to: '/dispatch' });

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
