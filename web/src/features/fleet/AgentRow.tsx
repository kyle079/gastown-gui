import { ListRow, StatusPill, Badge } from '@/components/primitives';
import type { Agent } from '@/lib/api/types';
import { agentSignal } from '@/features/dashboard/agentStatus';

/**
 * One agent inside a rig's crew. Reuses the Dashboard's `agentSignal` so a
 * polecat reads the same here as it does on the home surface — one vocabulary
 * for state across the console.
 */
export function AgentRow({ agent }: { agent: Agent }) {
  const sig = agentSignal(agent);
  const hook = agent.hook_bead || agent.hook;
  return (
    <ListRow
      title={<span className="font-mono">{agent.name}</span>}
      subtitle={hook ? <span className="font-mono">{hook}</span> : undefined}
      trailing={
        <>
          {agent.unread_mail > 0 && <Badge tone="info">{agent.unread_mail} mail</Badge>}
          <StatusPill tone={sig.tone} pulse={sig.pulse} label={sig.label} />
        </>
      }
    />
  );
}
