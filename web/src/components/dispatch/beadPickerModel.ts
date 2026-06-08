import { byUrgency } from '@/features/catalog/catalogMeta';
import type { Bead, Target } from '@/lib/api/types';

const STATUS_RANK: Record<string, number> = {
  blocked: 0,
  hooked: 1,
  in_progress: 1,
  pinned: 1,
  open: 2,
  deferred: 3,
};

function statusRank(status?: string): number {
  return STATUS_RANK[String(status ?? '').toLowerCase()] ?? 4;
}

export function buildDispatchBrowseList(beads: Bead[], limit = 8): Bead[] {
  const deduped = new Map<string, Bead>();

  for (const bead of beads) {
    if (!bead?.id) continue;
    if (String(bead.status ?? '').toLowerCase() === 'closed') continue;
    if (!deduped.has(bead.id)) deduped.set(bead.id, bead);
  }

  return [...deduped.values()]
    .sort((a, b) => {
      const rankDiff = statusRank(a.status) - statusRank(b.status);
      if (rankDiff !== 0) return rankDiff;
      return byUrgency(a, b);
    })
    .slice(0, limit);
}

export function targetOptionLabel(target: Pick<Target, 'name' | 'type' | 'role' | 'running' | 'has_work'>): string {
  const parts = [target.name];

  if (target.role) {
    parts.push(target.role);
  } else if (target.type && target.type !== 'agent') {
    parts.push(target.type);
  }

  if (target.running === false) {
    parts.push('stopped');
  } else if (target.has_work) {
    parts.push('busy');
  } else if (target.running === true) {
    parts.push('idle');
  }

  return parts.filter(Boolean).join(' · ');
}
