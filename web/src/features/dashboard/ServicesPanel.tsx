import { Panel, PanelHeader, ListRow, StatusPill } from '@/components/primitives';
import type { ServiceHealth } from '@/lib/api/types';

interface ServiceRow {
  name: string;
  health: ServiceHealth | undefined;
  detail: (h: ServiceHealth) => string;
}

/** Core infrastructure health: daemon, dolt, tmux. The operator's heartbeat. */
export function ServicesPanel({
  daemon,
  dolt,
  tmux,
}: {
  daemon?: ServiceHealth;
  dolt?: ServiceHealth;
  tmux?: ServiceHealth;
}) {
  const rows: ServiceRow[] = [
    { name: 'daemon', health: daemon, detail: (h) => (h.pid ? `pid ${h.pid}` : '') },
    { name: 'dolt', health: dolt, detail: (h) => (h.port ? `:${h.port}` : '') },
    {
      name: 'tmux',
      health: tmux,
      detail: (h) => (h.session_count != null ? `${h.session_count} sessions` : ''),
    },
  ];

  return (
    <Panel flush>
      <PanelHeader title="Services" hint="infrastructure" />
      <div className="divide-hairline">
        {rows.map((row) => {
          const running = row.health?.running ?? false;
          return (
            <ListRow
              key={row.name}
              title={<span className="font-mono">{row.name}</span>}
              subtitle={row.health ? row.detail(row.health) : '—'}
              trailing={
                <StatusPill
                  tone={running ? 'ok' : 'danger'}
                  pulse={running}
                  label={running ? 'up' : 'down'}
                />
              }
            />
          );
        })}
      </div>
    </Panel>
  );
}
