import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Badge,
  Button,
  Dialog,
  Panel,
  PanelHeader,
  StatusPill,
} from '@/components/primitives';
import { agentSignal } from '@/features/dashboard/agentStatus';
import { ComposeDialog } from '@/features/mail/ComposeDialog';
import { useActivity, useBeadDetail, useTrail } from '@/lib/query/hooks';
import type { ActivityEvent, Agent, TrailHookItem } from '@/lib/api/types';
import { compactAddress, rigFromAddress } from './opsModel';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-1.5">
      <div className="font-mono text-2xs uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-1 text-sm text-fg">{value}</div>
    </div>
  );
}

export function AgentDetailDialog({
  agent,
  open,
  onClose,
}: {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [composeOpen, setComposeOpen] = useState(false);
  const signal = agent ? agentSignal(agent) : null;
  const { data } = useTrail({ type: 'hooks', limit: 30 });
  const { data: activity } = useActivity();
  const history = ((data ?? []) as TrailHookItem[]).filter((item) =>
    agent ? item.actor === agent.address || item.actor === agent.name : false,
  );
  const { data: hookBead } = useBeadDetail(agent?.hook_bead ?? undefined);
  const lifecycle = useMemo(() => {
    if (!agent) return [];
    return (activity?.items ?? [])
      .filter((item) => item.actor === agent.address || item.actor === agent.name)
      .filter((item) => ['session_start', 'session_death', 'handoff', 'done', 'spawn'].includes(item.type))
      .slice(0, 8);
  }, [activity?.items, agent]);
  const rig = rigFromAddress(agent?.address);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={agent ? <span className="font-mono text-sm">{agent.address || agent.name}</span> : undefined}
      description="Current hook state, signal, and recent hook timeline."
      className="sm:max-w-3xl"
      footer={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setComposeOpen(true);
            }}
          >
            Mail
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!agent?.hook_bead}
            onClick={() => {
              if (agent?.hook_bead) {
                void navigate({ to: '/issues', search: { id: agent.hook_bead } });
                onClose();
              }
            }}
          >
            Open Bead
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigate({ to: '/terminal' });
              onClose();
            }}
          >
            Terminal
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (rig) {
                void navigate({ to: '/rigs/$rig', params: { rig } });
              } else {
                void navigate({ to: '/rigs' });
              }
              onClose();
            }}
          >
            Open Rig
          </Button>
        </>
      }
    >
      {agent && signal && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="State" value={<StatusPill tone={signal.tone} pulse={signal.pulse} label={signal.label} />} />
            <Field
              label="Mail"
              value={
                agent.unread_mail > 0 ? <Badge tone="info">{agent.unread_mail} unread</Badge> : '0 unread'
              }
            />
            <Field label="Hook Bead" value={<span className="font-mono">{agent.hook_bead || '—'}</span>} />
            <Field label="Hook" value={<span className="font-mono">{agent.hook || '—'}</span>} />
            <Field label="Session" value={<span className="font-mono text-xs">{agent.session || '—'}</span>} />
            <Field label="Role" value={<span className="font-mono">{compactAddress(agent.address)}</span>} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="flex flex-col gap-4">
              <Panel flush>
                <PanelHeader title="Lifecycle Timeline" hint={String(lifecycle.length)} />
                {lifecycle.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-faint">No recent lifecycle events for this agent.</div>
                ) : (
                  <div className="divide-hairline">
                    {lifecycle.map((item) => (
                      <div key={item.id} className="px-4 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-mono text-xs text-fg">{item.type}</div>
                            <div className="mt-0.5 text-sm text-muted">{describeLifecycle(item)}</div>
                          </div>
                          <div className="text-right font-mono text-2xs text-faint">{item.ts || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel flush>
                <PanelHeader title="Recent Hook Timeline" hint={String(history.length)} />
                {history.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-faint">No recent hook events for this agent.</div>
                ) : (
                  <div className="divide-hairline">
                    {history.slice(0, 8).map((item) => (
                      <div key={`${item.actor}:${item.timestamp}:${item.bead ?? 'none'}`} className="px-4 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-mono text-xs text-fg">{item.type}</div>
                            <div className="mt-0.5 text-sm text-muted">{item.bead ?? 'No bead recorded'}</div>
                          </div>
                          <div className="text-right font-mono text-2xs text-faint">
                            {item.time_relative || item.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <Panel flush>
              <PanelHeader title="Hook Context" hint={hookBead?.id ?? 'none'} />
              {!hookBead ? (
                <div className="px-4 py-6 text-sm text-faint">No active hook bead detail available.</div>
              ) : (
                <div className="flex flex-col gap-3 px-4 py-4">
                  <div>
                    <div className="font-mono text-xs text-fg">{hookBead.id}</div>
                    <div className="mt-1 text-sm text-muted">{hookBead.title}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={hookBead.status === 'blocked' ? 'warn' : hookBead.status === 'closed' ? 'ok' : 'accent'}>
                      {hookBead.status}
                    </Badge>
                    {hookBead.priority != null && <Badge tone="info">P{hookBead.priority}</Badge>}
                  </div>
                  {hookBead.notes ? (
                    <div className="rounded border border-line bg-surface px-3 py-2.5">
                      <div className="font-mono text-2xs text-faint">Handoff context</div>
                      <div className="mt-1 whitespace-pre-wrap text-xs text-muted">{hookBead.notes}</div>
                    </div>
                  ) : (
                    <div className="rounded border border-dashed border-line px-3 py-3 text-sm text-faint">
                      No persistent notes on this bead yet.
                    </div>
                  )}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      <ComposeDialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        prefill={{
          to: agent?.address || agent?.name || '',
          subject: agent?.hook_bead ? `Follow-up: ${agent.hook_bead}` : undefined,
        }}
      />
    </Dialog>
  );
}

function describeLifecycle(event: ActivityEvent): string {
  const bead = typeof event.payload?.bead === 'string' ? event.payload.bead : null;
  const branch = typeof event.payload?.branch === 'string' ? event.payload.branch : null;
  const target = typeof event.payload?.target === 'string' ? event.payload.target : null;

  if (event.type === 'done') return [bead, branch].filter(Boolean).join(' · ') || 'Completed work';
  if (event.type === 'handoff') return bead ? `Handoff on ${bead}` : 'Session handoff';
  if (event.type === 'spawn') return target ? `Spawned for ${target}` : 'Spawned';
  if (event.type === 'session_start') return 'Session started';
  if (event.type === 'session_death') return 'Session ended';
  return event.type;
}
