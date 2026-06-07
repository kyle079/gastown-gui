import type { Bead, Convoy, SchedulerStatus } from '@/lib/api/types';
import type { Tone } from '@/components/primitives';
import { pluralize } from '@/lib/utils/format';
import { byUrgency } from '@/features/catalog/catalogMeta';
import { convoySignal } from './workState';

export interface WorkAttentionItem {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
}

export interface NextActionItem {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
}

const HIDDEN_BEAD_STATUSES = new Set(['closed', 'deferred']);

function convoyTitle(raw: string): string {
  return raw.replace(/^Work:\s*/i, '').trim() || raw;
}

function beadStateRank(status: string): number {
  switch (status) {
    case 'blocked':
      return 0;
    case 'hooked':
    case 'in_progress':
    case 'working':
      return 1;
    case 'open':
      return 2;
    default:
      return 3;
  }
}

function byTriagePriority(a: Bead, b: Bead): number {
  const rank = beadStateRank(a.status) - beadStateRank(b.status);
  if (rank !== 0) return rank;
  return byUrgency(a, b);
}

export function triageBeads(beads: Bead[], limit = 8): Bead[] {
  return beads
    .filter((bead) => !HIDDEN_BEAD_STATUSES.has(bead.status))
    .sort(byTriagePriority)
    .slice(0, limit);
}

function urgentOpenBeads(beads: Bead[]): Bead[] {
  return beads.filter((bead) => bead.status === 'open' && (bead.priority ?? 99) <= 1).sort(byUrgency);
}

export function collectWorkAttention(
  convoys: Convoy[],
  beads: Bead[],
  scheduler?: SchedulerStatus | null,
): WorkAttentionItem[] {
  const blockedConvoys = convoys.filter((convoy) => convoySignal(convoy).state === 'blocked');
  const urgent = urgentOpenBeads(beads);
  const items: WorkAttentionItem[] = [];

  if (blockedConvoys.length > 0) {
    items.push({
      id: 'blocked-convoys',
      tone: 'warn',
      title: pluralize(blockedConvoys.length, 'blocked convoy'),
      detail: `Operator follow-up needed on ${convoyTitle(blockedConvoys[0].title)}.`,
    });
  }

  if (scheduler?.paused) {
    items.push({
      id: 'scheduler-paused',
      tone: 'danger',
      title: 'Scheduler paused',
      detail: 'No new polecat work will dispatch until capacity is resumed.',
    });
  } else if (scheduler && scheduler.queued_ready > 0 && scheduler.capacity.free === 0) {
    items.push({
      id: 'scheduler-saturated',
      tone: 'warn',
      title: 'Dispatch queue waiting on capacity',
      detail: `${pluralize(scheduler.queued_ready, 'ready bead')} waiting; no free slots.`,
    });
  }

  if (urgent.length > 0) {
    items.push({
      id: 'urgent-open-beads',
      tone: urgent[0].priority === 0 ? 'danger' : 'info',
      title: pluralize(urgent.length, 'urgent bead'),
      detail: `${urgent[0].id} is the highest-priority unhooked work item.`,
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'all-clear',
      tone: 'ok',
      title: 'Board is stable',
      detail: 'No blocked convoys, urgent beads, or scheduler bottlenecks right now.',
    });
  }

  return items;
}

export function collectNextActions(
  convoys: Convoy[],
  beads: Bead[],
  scheduler?: SchedulerStatus | null,
): NextActionItem[] {
  const actions: NextActionItem[] = [];
  const blockedConvoys = convoys.filter((convoy) => convoySignal(convoy).state === 'blocked');
  const activeConvoys = convoys.filter((convoy) => convoySignal(convoy).state === 'active');
  const urgent = urgentOpenBeads(beads);
  const queue = triageBeads(beads, 3).filter((bead) => bead.status === 'open');

  if (blockedConvoys.length > 0) {
    const first = blockedConvoys[0];
    actions.push({
      id: 'unblock-convoy',
      tone: 'warn',
      title: `Unblock ${convoyTitle(first.title)}`,
      detail: `${first.completed}/${first.total} complete; blocked work is stalling the convoy.`,
    });
  }

  if (scheduler?.paused) {
    actions.push({
      id: 'resume-scheduler',
      tone: 'danger',
      title: 'Resume scheduler capacity',
      detail: 'The queue is paused, so no ready work can start.',
    });
  } else if (scheduler && scheduler.queued_ready > 0 && scheduler.capacity.free > 0) {
    actions.push({
      id: 'dispatch-ready',
      tone: 'accent',
      title: 'Dispatch ready work',
      detail: `${pluralize(scheduler.capacity.free, 'free slot')} available for ${pluralize(
        scheduler.queued_ready,
        'ready bead',
      )}.`,
    });
  } else if (scheduler && scheduler.queued_ready > 0 && scheduler.capacity.free === 0) {
    actions.push({
      id: 'watch-capacity',
      tone: 'info',
      title: 'Watch for the next free slot',
      detail: `${pluralize(scheduler.queued_ready, 'ready bead')} will move once a polecat finishes.`,
    });
  }

  if (urgent.length > 0) {
    actions.push({
      id: 'review-urgent',
      tone: urgent[0].priority === 0 ? 'danger' : 'info',
      title: `Review ${urgent[0].id}`,
      detail: `${urgent[0].title} should be the next dispatch candidate.`,
    });
  } else if (activeConvoys.length === 0 && queue.length > 0) {
    actions.push({
      id: 'seed-next-convoy',
      tone: 'accent',
      title: `Seed ${queue[0].id}`,
      detail: 'No convoy is actively moving; start the next bead into motion.',
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'steady-state',
      tone: 'ok',
      title: 'Hold steady',
      detail: 'Active convoys are moving and the queue has no immediate operator action.',
    });
  }

  return actions.slice(0, 4);
}
