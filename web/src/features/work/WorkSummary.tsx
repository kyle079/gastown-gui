import { Panel } from '@/components/primitives';
import type { WorkTotals } from './workState';

interface Stat {
  label: string;
  value: number;
  /** Draw attention only when the number means something. */
  accent?: boolean;
  warn?: boolean;
}

/**
 * A single composed stat bar for the work queue — not a grid of identical
 * metric cards. Hairline-separated, mono numerals, read left to right.
 * Blocked draws warn when non-zero; in-flight draws accent.
 */
export function WorkSummary({ totals }: { totals: WorkTotals }) {
  const stats: Stat[] = [
    { label: 'Convoys', value: totals.convoys },
    { label: 'In flight', value: totals.inFlight, accent: totals.inFlight > 0 },
    { label: 'Blocked', value: totals.blocked, warn: totals.blocked > 0 },
    { label: 'Done', value: totals.done },
  ];

  return (
    <Panel flush className="overflow-hidden">
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-surface px-4 py-3.5 sm:px-5 sm:py-4">
            <span className="text-2xs uppercase tracking-wider text-faint">{s.label}</span>
            <span
              className={`font-mono text-2xl leading-none tabular-nums ${
                s.warn ? 'text-warn' : s.accent ? 'text-accent' : 'text-fg'
              }`}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
