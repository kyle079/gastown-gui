import { Panel, PanelHeader, StatusPill } from '@/components/primitives';
import type { Convoy } from '@/lib/api/types';
import { pluralize, relativeTime } from '@/lib/utils/format';
import { convoySignal, convoyProgress, convoyTitle } from './convoyQueue';
import { ProgressBar } from './ProgressBar';
import { TrackedRow } from './TrackedRow';

/**
 * The drill-in: a single convoy's progress and the beads it tracks. Signal over
 * noise — the headline state, progress bar, and counts sit up top; the tracked
 * work (who's on what) follows.
 */
export function ConvoyDetail({ convoy }: { convoy: Convoy }) {
  const sig = convoySignal(convoy);
  const beads = (convoy.tracked ?? []).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-base text-fg">{convoyTitle(convoy)}</h2>
            <p className="mt-1 font-mono text-xs text-faint">
              {convoy.id}
              {convoy.created_at ? ` · created ${relativeTime(convoy.created_at)}` : ''}
            </p>
          </div>
          <StatusPill tone={sig.tone} pulse={sig.pulse} label={sig.label} className="shrink-0" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={convoyProgress(convoy)} tone={sig.tone} className="flex-1" />
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
            {convoy.completed}/{convoy.total} done
          </span>
        </div>
      </Panel>

      <Panel flush>
        <PanelHeader title="Tracked work" hint={pluralize(beads.length, 'bead')} />
        {beads.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-faint">
            This convoy tracks no beads.
          </div>
        ) : (
          <div className="divide-hairline">
            {beads.map((bead) => (
              <TrackedRow key={bead.id} bead={bead} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
