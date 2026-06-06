import { Panel, PanelHeader, ListRow, StatusDot, StatusPill } from '@/components/primitives';
import { useMergeQueue, useRefineryStatus, useWitnessStatus } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';

function StatusRow({
  label,
  running,
  detail,
}: {
  label: string;
  running: boolean;
  detail?: string;
}) {
  return (
    <ListRow
      title={<span className="font-mono text-sm">{label}</span>}
      subtitle={detail}
      trailing={
        <StatusPill tone={running ? 'ok' : 'danger'} pulse={running} label={running ? 'up' : 'down'} />
      }
    />
  );
}

/** Refinery + witness health for a single rig, plus MQ queue depth. */
export function RigInfraPanel({ rig }: { rig: string }) {
  const { data: mq } = useMergeQueue(rig);
  const { data: refinery } = useRefineryStatus(rig);
  const { data: witness } = useWitnessStatus(rig);

  const mqItems = mq ?? [];
  const mqHint = mqItems.length > 0 ? String(mqItems.length) : undefined;

  return (
    <>
      <Panel flush>
        <PanelHeader title="Infrastructure" />
        <div className="divide-hairline">
          {refinery !== undefined && (
            <StatusRow
              label="refinery"
              running={refinery.running}
              detail={refinery.session || undefined}
            />
          )}
          {witness !== undefined && (
            <StatusRow
              label="witness"
              running={witness.running}
              detail={
                witness.monitored_polecats
                  ? `watching ${witness.monitored_polecats.length}`
                  : witness.session || undefined
              }
            />
          )}
          {refinery === undefined && witness === undefined && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted">
              <StatusDot tone="neutral" />
              Infra status unavailable
            </div>
          )}
        </div>
      </Panel>

      {(mqItems.length > 0 || mq !== undefined) && (
        <Panel flush>
          <PanelHeader title="Merge Queue" hint={mqHint} />
          {mqItems.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted">
              <StatusDot tone="ok" />
              Queue empty
            </div>
          ) : (
            <div className="divide-hairline">
              {mqItems.map((mr) => (
                <ListRow
                  key={mr.id}
                  title={
                    <span className="truncate text-sm text-fg">{mr.title || mr.id}</span>
                  }
                  subtitle={
                    <span className="font-mono text-xs text-faint">
                      {mr.id}
                      {mr.created_at ? ` · ${relativeTime(mr.created_at)}` : ''}
                    </span>
                  }
                  trailing={
                    <StatusDot
                      tone={
                        mr.status === 'in_progress'
                          ? 'ok'
                          : mr.status === 'closed'
                          ? 'neutral'
                          : 'warn'
                      }
                      pulse={mr.status === 'in_progress'}
                    />
                  }
                />
              ))}
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
