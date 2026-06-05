import { Panel, PanelHeader, ListRow, StatusPill, Badge } from '@/components/primitives';
import type { Agent } from '@/lib/api/types';
import { agentSignal } from './agentStatus';
import { humanize } from '@/lib/utils/format';

/** Town-level coordinators (mayor, deacon) — the agents that run the whole town. */
export function HqPanel({ agents }: { agents: Agent[] }) {
  return (
    <Panel flush>
      <PanelHeader title="HQ" hint="coordinators" />
      <div className="divide-hairline">
        {agents.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-faint">No HQ agents</div>
        ) : (
          agents.map((agent) => {
            const sig = agentSignal(agent);
            return (
              <ListRow
                key={agent.address || agent.name}
                title={<span className="font-mono">{agent.name}</span>}
                subtitle={humanize(agent.role)}
                trailing={
                  <>
                    {agent.unread_mail > 0 && <Badge tone="info">{agent.unread_mail} mail</Badge>}
                    <StatusPill tone={sig.tone} pulse={sig.pulse} label={sig.label} />
                  </>
                }
              />
            );
          })
        )}
      </div>
    </Panel>
  );
}
