import { ListRow, StatusPill, Badge } from '@/components/primitives';
import type { TrackedBead } from '@/lib/api/types';
import { beadState, STATE_TONE, shortAssignee } from './convoyQueue';

/**
 * One tracked bead inside a convoy — the "who's on what" line. The bead's state
 * reads in the same vocabulary as the convoy headline; the assignee (short
 * address) answers who owns it right now.
 */
export function TrackedRow({ bead }: { bead: TrackedBead }) {
  const state = beadState(bead);
  const who = shortAssignee(bead.assignee);
  return (
    <ListRow
      title={<span className="truncate">{bead.title}</span>}
      subtitle={<span className="font-mono">{bead.id}</span>}
      trailing={
        <>
          {who && <Badge tone="neutral">{who}</Badge>}
          <StatusPill tone={STATE_TONE[state]} pulse={state === 'active'} label={state} />
        </>
      }
    />
  );
}
