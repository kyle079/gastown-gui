import { Panel } from '@/components/primitives';
import type { StatusSummary } from '@/lib/api/types';

interface Metric {
  label: string;
  value: number;
  /** Draw attention only when it matters (e.g. active work). */
  accent?: boolean;
}

/**
 * A single composed stat bar — deliberately NOT a grid of identical metric
 * cards (an AI tell). Numbers in mono, hairline-separated, read left to right.
 */
export function MetricStrip({ summary }: { summary: StatusSummary }) {
  const metrics: Metric[] = [
    { label: 'Rigs', value: summary.rig_count },
    { label: 'Polecats', value: summary.polecat_count },
    { label: 'Active hooks', value: summary.active_hooks, accent: summary.active_hooks > 0 },
    { label: 'Crews', value: summary.crew_count },
    { label: 'Witnesses', value: summary.witness_count },
    { label: 'Refineries', value: summary.refinery_count },
  ];

  return (
    <Panel flush className="flex flex-wrap items-stretch divide-x divide-line">
      {metrics.map((m) => (
        <div key={m.label} className="flex min-w-[8rem] flex-1 flex-col gap-1 px-5 py-4">
          <span className="text-2xs uppercase tracking-wider text-faint">{m.label}</span>
          <span
            className={`font-mono text-2xl leading-none tabular-nums ${
              m.accent ? 'text-accent' : 'text-fg'
            }`}
          >
            {m.value}
          </span>
        </div>
      ))}
    </Panel>
  );
}
