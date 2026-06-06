import type { Convoy, TrackedBead } from '@/lib/api/types';
import type { Tone } from '@/components/primitives';

/**
 * Convoy state, derived — not stored. The work surface answers one question per
 * convoy: where is this in the queue, and does it need the operator? Severity
 * wins (a single blocked bead outranks the rest), mirroring Fleet's health rule
 * so the two surfaces speak one vocabulary.
 */

export type WorkState = 'blocked' | 'active' | 'queued' | 'done';

export interface ConvoySignal {
  tone: Tone;
  /** One-word headline for the pill. */
  label: WorkState;
  /** Live pulse when work is actively moving. */
  pulse: boolean;
}

function tracked(convoy: Convoy): TrackedBead[] {
  return (convoy.tracked ?? []).filter(Boolean);
}

/** Per-bead position in its convoy's lifecycle. */
export function beadState(b: TrackedBead): WorkState {
  if (b.status === 'closed') return 'done';
  if (b.status === 'in_progress' || b.status === 'hooked') return 'active';
  if (b.blocked) return 'blocked';
  return 'queued';
}

export const STATE_TONE: Record<WorkState, Tone> = {
  blocked: 'warn',
  active: 'accent',
  queued: 'info',
  done: 'neutral',
};

/**
 * Roll a convoy's tracked beads up to a single signal. A finished convoy (closed
 * or every bead complete) reads done; otherwise severity decides the headline:
 * blocked (stuck, wants the operator) → active (in flight) → queued (waiting to
 * dispatch). The progress bar carries the remainder, so the headline can be a
 * single honest word.
 */
export function convoySignal(convoy: Convoy): ConvoySignal {
  const beads = tracked(convoy);
  const finished =
    convoy.status === 'closed' || (convoy.total > 0 && convoy.completed >= convoy.total);
  if (finished) return { tone: STATE_TONE.done, label: 'done', pulse: false };

  const states = beads.map(beadState);
  if (states.includes('blocked')) return { tone: STATE_TONE.blocked, label: 'blocked', pulse: false };
  if (states.includes('active')) return { tone: STATE_TONE.active, label: 'active', pulse: true };
  if (states.includes('queued')) return { tone: STATE_TONE.queued, label: 'queued', pulse: false };
  // No tracked beads (or all in an unknown state) — treat an open convoy as queued.
  return { tone: STATE_TONE.queued, label: 'queued', pulse: false };
}

/** Completion as a 0–1 fraction, guarding the empty-convoy divide-by-zero. */
export function convoyProgress(convoy: Convoy): number {
  if (convoy.total <= 0) return 0;
  return Math.min(1, Math.max(0, convoy.completed / convoy.total));
}

const STATE_RANK: Record<WorkState, number> = {
  blocked: 0,
  active: 1,
  queued: 2,
  done: 3,
};

/**
 * Queue order: what needs the operator floats up. Blocked first, then in-flight,
 * then waiting, then finished. Ties break toward the most remaining work, then
 * the newest convoy, then id — so the ordering is stable across polls.
 */
export function compareConvoys(a: Convoy, b: Convoy): number {
  const byState = STATE_RANK[convoySignal(a).label] - STATE_RANK[convoySignal(b).label];
  if (byState !== 0) return byState;

  const remainingA = a.total - a.completed;
  const remainingB = b.total - b.completed;
  if (remainingA !== remainingB) return remainingB - remainingA;

  const timeA = a.created_at ? Date.parse(a.created_at) : 0;
  const timeB = b.created_at ? Date.parse(b.created_at) : 0;
  if (timeA !== timeB) return timeB - timeA;

  return a.id.localeCompare(b.id);
}

export interface QueueSummary {
  blocked: number;
  active: number;
  queued: number;
  done: number;
  total: number;
}

/** Tallies for the surface header — counts by headline state. */
export function summarizeQueue(convoys: Convoy[]): QueueSummary {
  const summary: QueueSummary = { blocked: 0, active: 0, queued: 0, done: 0, total: convoys.length };
  for (const c of convoys) summary[convoySignal(c).label] += 1;
  return summary;
}

/**
 * Display title — convoys are created as "Work: <bead title>", so strip the
 * redundant prefix on a surface that's all about work.
 */
export function convoyTitle(convoy: Convoy): string {
  return convoy.title.replace(/^Work:\s*/i, '').trim() || convoy.title;
}

/** Short assignee label: the last path segment of a routing address. */
export function shortAssignee(assignee: string | null | undefined): string | null {
  if (!assignee) return null;
  const parts = assignee.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : assignee;
}
