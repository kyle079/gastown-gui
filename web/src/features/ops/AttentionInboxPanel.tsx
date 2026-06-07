import { useNavigate } from '@tanstack/react-router';
import { Badge, Button, ListRow, Panel, PanelHeader, StatusDot } from '@/components/primitives';
import { useEscalations, useReady } from '@/lib/query/hooks';
import type { Agent, TownStatus } from '@/lib/api/types';
import { collectAttentionItems } from './opsModel';

export function AttentionInboxPanel({
  status,
  onSelectAgent,
}: {
  status: TownStatus;
  onSelectAgent: (agent: Agent) => void;
}) {
  const navigate = useNavigate();
  const { data: escalations } = useEscalations();
  const { data: ready } = useReady();
  const items = collectAttentionItems(status, escalations ?? [], ready ?? null);
  const agents = new Map(
    [
      ...(status.agents ?? []),
      ...(status.rigs ?? []).flatMap((rig) => rig.agents ?? []),
    ].map((agent) => [agent.address, agent]),
  );

  return (
    <Panel flush>
      <PanelHeader
        title="Attention Inbox"
        hint={items.length ? String(items.length) : 'clear'}
        actions={
          <Button size="sm" variant="ghost" onClick={() => void navigate({ to: '/activity' })}>
            Live feed
          </Button>
        }
      />
      {items.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-6 text-sm text-muted">
          <StatusDot tone="ok" />
          No urgent operator work right now.
        </div>
      ) : (
        <div className="divide-hairline">
          {items.map((item) => (
            <ListRow
              key={item.id}
              interactive
              onClick={() => {
                if (item.agentAddress && agents.has(item.agentAddress)) {
                  onSelectAgent(agents.get(item.agentAddress) as Agent);
                  return;
                }
                void navigate({ to: item.route });
              }}
              leading={<StatusDot tone={item.tone} />}
              title={<span className="font-mono text-sm">{item.title}</span>}
              subtitle={item.detail}
              trailing={
                <>
                  <Badge tone={item.tone}>{item.nextAction}</Badge>
                </>
              }
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
