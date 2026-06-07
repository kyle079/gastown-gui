import {
  Badge,
  ListRow,
  Panel,
  PanelHeader,
  StatusDot,
} from '@/components/primitives';
import { useMergeQueue, useReady, useRefineryStatus, useWitnessStatus } from '@/lib/query/hooks';
import { priorityLabel, priorityTone, statusLabel, statusTone } from '@/features/catalog/catalogMeta';
import type { Agent, Rig, TownStatus } from '@/lib/api/types';

function RigQueueCard({ rig }: { rig: Rig }) {
  const { data: queue } = useMergeQueue(rig.name);
  const { data: refinery } = useRefineryStatus(rig.name);
  const { data: witness } = useWitnessStatus(rig.name);

  return (
    <div className="rounded-md border border-line bg-surface-alt p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-fg">{rig.name}</div>
          <div className="mt-1 text-sm text-muted">
            MQ {(queue ?? []).length} · refinery {refinery?.running ? 'up' : 'down'} · witness{' '}
            {witness?.running ? 'up' : 'down'}
          </div>
        </div>
        <StatusDot tone={refinery?.running ? 'ok' : 'warn'} />
      </div>

      {(queue ?? []).length === 0 ? (
        <div className="mt-3 text-sm text-faint">No merge requests queued.</div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {(queue ?? []).slice(0, 4).map((mr) => (
            <div key={mr.id} className="rounded border border-line bg-surface px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-fg">{mr.id}</div>
                  <div className="truncate text-sm text-muted">{mr.title}</div>
                </div>
                <Badge tone={statusTone(mr.status)}>{statusLabel(mr.status)}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewQueuePanel({
  status,
  onSelectAgent,
}: {
  status: TownStatus;
  onSelectAgent: (agent: Agent) => void;
}) {
  const { data: ready } = useReady();
  const activeAgents = [
    ...(status.agents ?? []),
    ...(status.rigs ?? []).flatMap((rig) => rig.agents ?? []),
  ].filter((agent) => agent.running && (agent.has_work || agent.hook || agent.hook_bead));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel flush>
          <PanelHeader title="Mayor / Overseer Review Queue" hint={String((ready?.sources ?? []).length)} />
          {!ready?.sources || ready.sources.length === 0 ? (
            <div className="px-4 py-6 text-sm text-faint">No ready work waiting for dispatch.</div>
          ) : (
            <div className="divide-hairline">
              {ready.sources.map((source) => (
                <div key={source.name} className="px-4 py-3">
                  <div className="mb-2 font-mono text-xs text-fg">{source.name}</div>
                  <div className="flex flex-col gap-2">
                    {(source.issues ?? []).slice(0, 4).map((issue) => (
                      <div key={issue.id} className="rounded border border-line bg-surface-alt px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono text-xs text-fg">{issue.id}</div>
                            <div className="truncate text-sm text-muted">{issue.title}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={priorityTone(issue.priority)}>{priorityLabel(issue.priority)}</Badge>
                            <Badge tone={statusTone(issue.status)}>{statusLabel(issue.status)}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel flush>
          <PanelHeader title="Active Hooked Agents" hint={String(activeAgents.length)} />
          {activeAgents.length === 0 ? (
            <div className="px-4 py-6 text-sm text-faint">No active hooks right now.</div>
          ) : (
            <div className="divide-hairline">
              {activeAgents.map((agent) => (
                <ListRow
                  key={agent.address || agent.name}
                  interactive
                  onClick={() => onSelectAgent(agent)}
                  leading={<StatusDot tone={agent.state === 'blocked' ? 'warn' : agent.state === 'stalled' ? 'danger' : 'accent'} />}
                  title={<span className="font-mono text-sm">{agent.address || agent.name}</span>}
                  subtitle={agent.hook_bead || agent.hook || 'Hooked work'}
                  trailing={
                    <>
                      {agent.unread_mail > 0 && <Badge tone="info">{agent.unread_mail} mail</Badge>}
                      <Badge tone={agent.state === 'blocked' ? 'warn' : agent.state === 'stalled' ? 'danger' : 'accent'}>
                        {agent.state}
                      </Badge>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel flush>
        <PanelHeader title="Merge Queue / Refinery" hint={String((status.rigs ?? []).length)} />
        {(status.rigs ?? []).length === 0 ? (
          <div className="px-4 py-6 text-sm text-faint">No rigs configured.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4">
            {(status.rigs ?? []).map((rig) => (
              <RigQueueCard key={rig.name} rig={rig} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
