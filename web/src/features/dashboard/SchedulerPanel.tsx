import { Panel, PanelHeader, StatusDot } from '@/components/primitives';
import { useSchedulerStatus } from '@/lib/query/hooks';

/** Scheduler capacity snapshot — slot accounting from `gt scheduler status --json`. */
export function SchedulerPanel() {
  const { data, isLoading, isError } = useSchedulerStatus();

  if (isLoading) {
    return (
      <Panel flush>
        <PanelHeader title="Scheduler" hint="loading…" />
        <div className="px-4 py-6 text-sm text-muted">Fetching scheduler status…</div>
      </Panel>
    );
  }

  if (isError || !data) {
    return (
      <Panel flush>
        <PanelHeader title="Scheduler" />
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
          <StatusDot tone="warn" />
          Scheduler unavailable
        </div>
      </Panel>
    );
  }

  const cap = data.capacity;
  const usedPct = cap.max > 0 ? Math.round((cap.working / cap.max) * 100) : 0;
  const tone = data.paused ? 'warn' : cap.free === 0 ? 'warn' : 'ok';

  const rows: { label: string; value: number | string; accent?: boolean }[] = [
    { label: 'capacity', value: `${cap.working} / ${cap.max}`, accent: cap.working > 0 },
    { label: 'free slots', value: cap.free, accent: cap.free === 0 },
    { label: 'queued', value: data.queued_ready },
    { label: 'active polecats', value: data.active_polecats, accent: data.active_polecats > 0 },
    { label: 'pending MR', value: cap.pending_mr },
  ];

  return (
    <Panel flush>
      <PanelHeader
        title="Scheduler"
        hint={data.paused ? 'paused' : `${usedPct}% used`}
        actions={<StatusDot tone={tone} pulse={!data.paused && cap.working > 0} />}
      />
      <div className="divide-hairline">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="font-mono text-xs uppercase tracking-wider text-faint">{r.label}</span>
            <span
              className={`font-mono tabular-nums ${r.accent ? 'text-accent' : 'text-fg'}`}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
