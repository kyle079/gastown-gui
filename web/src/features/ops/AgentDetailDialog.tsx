import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Badge,
  Button,
  Dialog,
  Input,
  Panel,
  PanelHeader,
  StatusPill,
  Textarea,
  useToast,
} from '@/components/primitives';
import { agentSignal } from '@/features/dashboard/agentStatus';
import {
  usePolecatOutput,
  usePolecatRuntimeAction,
  useSendMail,
  useSendNudge,
  useServiceRuntimeAction,
  useTrail,
} from '@/lib/query/hooks';
import type { Agent, TrailHookItem } from '@/lib/api/types';
import {
  compactAddress,
  isPolecatAgent,
  nameFromAddress,
  rigFromAddress,
  runtimeServiceForAgent,
} from './opsModel';

function Field({ label, value }: { label: string; value: ReactNode }) {
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
  const { notify } = useToast();
  const signal = agent ? agentSignal(agent) : null;
  const { data } = useTrail({ type: 'hooks', limit: 30 });
  const sendMail = useSendMail();
  const sendNudge = useSendNudge();
  const polecatAction = usePolecatRuntimeAction();
  const serviceAction = useServiceRuntimeAction();
  const history = ((data ?? []) as TrailHookItem[]).filter((item) =>
    agent ? item.actor === agent.address || item.actor === agent.name : false,
  );
  const rig = rigFromAddress(agent?.address);
  const name = nameFromAddress(agent?.address);
  const polecat = isPolecatAgent(agent);
  const runtimeService = runtimeServiceForAgent(agent);
  const { data: output, isLoading: outputLoading } = usePolecatOutput(
    rig ?? undefined,
    name ?? undefined,
    open && polecat,
  );
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailMessage, setMailMessage] = useState('');

  useEffect(() => {
    if (!open || !agent) return;
    setNudgeMessage('');
    setMailMessage('');
    setMailSubject(agent.hook_bead ? `Operator: ${agent.hook_bead}` : `Operator note for ${agent.name}`);
  }, [agent, open]);

  if (!agent || !signal) return null;

  const currentAgent = agent;
  const runtimePending = polecatAction.isPending || serviceAction.isPending;

  function triggerNudge() {
    if (!currentAgent.address || !nudgeMessage.trim()) return;
    sendNudge.mutate(
      { target: currentAgent.address, message: nudgeMessage.trim() },
      {
        onSuccess: () => {
          notify(`Nudged ${compactAddress(currentAgent.address)}`, 'ok');
          setNudgeMessage('');
        },
        onError: (error) => notify(error instanceof Error ? error.message : 'Nudge failed', 'danger'),
      },
    );
  }

  function triggerMail() {
    if (!currentAgent.address || !mailSubject.trim() || !mailMessage.trim()) return;
    sendMail.mutate(
      {
        to: currentAgent.address,
        subject: mailSubject.trim(),
        message: mailMessage.trim(),
        priority: currentAgent.state === 'blocked' || currentAgent.state === 'stalled' ? 'high' : 'normal',
      },
      {
        onSuccess: () => {
          notify(`Sent mail to ${compactAddress(currentAgent.address)}`, 'ok');
          setMailMessage('');
        },
        onError: (error) => notify(error instanceof Error ? error.message : 'Mail failed', 'danger'),
      },
    );
  }

  function triggerRuntime(action: 'start' | 'restart' | 'stop') {
    if (polecat && rig && name) {
      polecatAction.mutate(
        { rig, name, action },
        {
          onSuccess: (result) => notify(result.message || `${action} ${name}`, 'ok'),
          onError: (error) => notify(error instanceof Error ? error.message : 'Runtime action failed', 'danger'),
        },
      );
      return;
    }

    if (!runtimeService) return;

    const mappedAction: 'up' | 'restart' | 'down' =
      action === 'start' ? 'up' : action === 'stop' ? 'down' : 'restart';
    serviceAction.mutate(
      {
        service: runtimeService,
        action: mappedAction,
        rig: runtimeService === 'witness' || runtimeService === 'refinery' ? rig ?? undefined : undefined,
      },
      {
        onSuccess: (result) => notify(result.message || `${mappedAction} ${runtimeService}`, 'ok'),
        onError: (error) => notify(error instanceof Error ? error.message : 'Runtime action failed', 'danger'),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={<span className="font-mono text-sm">{agent.address || agent.name}</span>}
      description="Direct operator controls for messaging, runtime intervention, and current work context."
      className="sm:max-w-4xl"
      footer={
        <>
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
                void navigate({ to: '/fleet/$rig', params: { rig } });
              } else {
                void navigate({ to: '/fleet' });
              }
              onClose();
            }}
          >
            Open Rig
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="flex flex-col gap-4">
            <Panel flush>
              <PanelHeader
                title="Profile / Runtime"
                hint={polecat ? 'polecat controls' : runtimeService ?? 'read-only profile'}
              />
              <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
                <Field label="State" value={<StatusPill tone={signal.tone} pulse={signal.pulse} label={signal.label} />} />
                <Field
                  label="Mail"
                  value={agent.unread_mail > 0 ? <Badge tone="info">{agent.unread_mail} unread</Badge> : '0 unread'}
                />
                <Field label="Address" value={<span className="font-mono text-xs">{agent.address || agent.name}</span>} />
                <Field label="Session" value={<span className="font-mono text-xs">{agent.session || output?.session || '—'}</span>} />
                <Field label="Alias" value={agent.agent_alias || '—'} />
                <Field label="Info" value={agent.agent_info || '—'} />
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                <Button size="sm" variant="default" disabled={runtimePending || (!polecat && !runtimeService)} onClick={() => triggerRuntime('start')}>
                  Start
                </Button>
                <Button size="sm" variant="default" disabled={runtimePending || (!polecat && !runtimeService)} onClick={() => triggerRuntime('restart')}>
                  Restart
                </Button>
                <Button size="sm" variant="danger" disabled={runtimePending || (!polecat && !runtimeService)} onClick={() => triggerRuntime('stop')}>
                  Stop
                </Button>
                {!polecat && !runtimeService && (
                  <span className="text-xs text-faint">Runtime controls are available for polecats and core services.</span>
                )}
              </div>
            </Panel>

            <Panel flush>
              <PanelHeader title="Work In Progress" hint={agent.hook_bead || agent.hook || 'idle'} />
              <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
                <Field label="Hook Bead" value={<span className="font-mono">{agent.hook_bead || '—'}</span>} />
                <Field label="Hook" value={<span className="font-mono">{agent.hook || '—'}</span>} />
                <Field label="Rig" value={<span className="font-mono">{rig || '—'}</span>} />
                <Field label="Role" value={<span className="font-mono">{compactAddress(agent.address)}</span>} />
              </div>
              {polecat && (
                <div className="border-t border-line px-4 py-3">
                  <div className="mb-2 font-mono text-2xs uppercase tracking-wider text-faint">Live Pane Tail</div>
                  {outputLoading ? (
                    <div className="text-sm text-faint">Loading terminal output…</div>
                  ) : (
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-line bg-surface-alt p-3 font-mono text-xs text-muted">
                      {output?.output?.trim() || 'No terminal output available.'}
                    </pre>
                  )}
                </div>
              )}
            </Panel>
          </div>

          <div className="flex flex-col gap-4">
            <Panel flush>
              <PanelHeader title="Quick Nudge" hint="ephemeral operator prompt" />
              <div className="flex flex-col gap-3 px-4 py-4">
                <Textarea
                  rows={4}
                  value={nudgeMessage}
                  onChange={(event) => setNudgeMessage(event.target.value)}
                  placeholder="Check hook progress, escalate blockers, or request a handoff update."
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!agent.address || !nudgeMessage.trim() || sendNudge.isPending}
                    onClick={triggerNudge}
                  >
                    {sendNudge.isPending ? 'Sending…' : 'Send Nudge'}
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel flush>
              <PanelHeader title="Direct Mail" hint="persistent message" />
              <div className="flex flex-col gap-3 px-4 py-4">
                <Input value={mailSubject} onChange={(event) => setMailSubject(event.target.value)} placeholder="Subject" />
                <Textarea
                  rows={5}
                  value={mailMessage}
                  onChange={(event) => setMailMessage(event.target.value)}
                  placeholder="Write a durable instruction or response."
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!agent.address || !mailSubject.trim() || !mailMessage.trim() || sendMail.isPending}
                    onClick={triggerMail}
                  >
                    {sendMail.isPending ? 'Sending…' : 'Send Mail'}
                  </Button>
                </div>
              </div>
            </Panel>
          </div>
        </div>

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
    </Dialog>
  );
}
