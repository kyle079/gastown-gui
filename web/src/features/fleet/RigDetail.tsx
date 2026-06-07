import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { Button, Panel, PanelHeader, StatusPill, StatusDot } from '@/components/primitives';
import type { Agent, Rig } from '@/lib/api/types';
import { pluralize } from '@/lib/utils/format';
import { rigHealth, groupRigAgents } from './rigHealth';
import { AgentRow } from './AgentRow';
import { RigInfraPanel } from './RigInfraPanel';
import { RemoveRigDialog } from './RigActionDialogs';

function AgentGroup({ title, agents }: { title: string; agents: Agent[] }) {
  if (agents.length === 0) return null;
  return (
    <Panel flush>
      <PanelHeader title={title} hint={String(agents.length)} />
      <div className="divide-hairline">
        {agents.map((a) => (
          <AgentRow key={a.address || a.name} agent={a} />
        ))}
      </div>
    </Panel>
  );
}

/**
 * The drill-in: a single rig's health and crew. Signal over noise — the health
 * line and any issues sit up top; the agents that do the work follow, grouped
 * services → polecats → crew.
 */
export function RigDetail({ rig }: { rig: Rig }) {
  const navigate = useNavigate();
  const health = rigHealth(rig);
  const groups = groupRigAgents(rig);
  const [removing, setRemoving] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-mono text-base text-fg">{rig.name}</h2>
            {rig.git_url && (
              <p className="mt-1 break-all font-mono text-xs text-faint">{rig.git_url}</p>
            )}
            <Link
              to="/prs"
              search={{ state: 'open', q: rig.name }}
              className="mt-1 inline-block font-mono text-xs text-accent underline-offset-2 hover:underline"
            >
              view PRs →
            </Link>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusPill tone={health.tone} pulse={health.pulse} label={health.label} />
            <span className="font-mono text-xs tabular-nums text-muted">
              {health.running}/{health.total} live
            </span>
            <Button variant="danger" size="sm" onClick={() => setRemoving(true)}>
              Remove rig
            </Button>
          </div>
        </div>

        {health.issues.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
            {health.issues.map((issue) => (
              <div key={issue} className="flex items-center gap-2 text-sm text-fg">
                <StatusDot tone={health.tone} />
                {issue}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <RigInfraPanel rig={rig.name} />

      <AgentGroup title="Services" agents={groups.services} />
      <AgentGroup title="Polecats" agents={groups.polecats} />
      <AgentGroup title="Crew" agents={groups.crew} />
      <AgentGroup title="Other" agents={groups.other} />

      {health.total === 0 && (
        <Panel className="py-10 text-center text-sm text-faint">
          No agents in this rig — {pluralize(rig.polecat_count, 'polecat')} configured, none running.
        </Panel>
      )}

      <RemoveRigDialog
        rigName={rig.name}
        open={removing}
        onClose={() => setRemoving(false)}
        onRemoved={() => void navigate({ to: '/rigs' })}
      />
    </div>
  );
}
