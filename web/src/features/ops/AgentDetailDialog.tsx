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
import { useTrail } from '@/lib/query/hooks';
import type { Agent, TrailHookItem } from '@/lib/api/types';
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
  const signal = agent ? agentSignal(agent) : null;
  const { data } = useTrail({ type: 'hooks', limit: 30 });
  const history = ((data ?? []) as TrailHookItem[]).filter((item) =>
    agent ? item.actor === agent.address || item.actor === agent.name : false,
  );
  const rig = rigFromAddress(agent?.address);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={agent ? <span className="font-mono text-sm">{agent.address || agent.name}</span> : undefined}
      description="Current hook state, signal, and recent hook timeline."
      footer={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigate({ to: '/mail' });
              onClose();
            }}
          >
            Mail
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      )}
    </Dialog>
  );
}
