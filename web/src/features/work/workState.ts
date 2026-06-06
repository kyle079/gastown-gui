import type { Convoy, TrackedBead } from '@/lib/api/types';
import type { Tone } from '@/components/primitives';

export type ConvoyState = 'blocked' | 'active' | 'queued' | 'done';

export interface ConvoySignal {
  state: ConvoyState;
  tone: Tone;
  label: string;
  /** Live pulse while work is in flight. */
  pulse: boolean;
}

const ACTIVE_STATUSES = new Set(['hooked', 'in_progress', 'working']);

/**
 * Derive a single convoy state from its tracked beads — the "signal over noise"
 * collapse. Severity order: blocked (needs the operator) → active (in flight)
 * → queued (waiting) → done.
 */
export function convoySignal(convoy: Pick<Convoy, 'tracked' | 'completed' | 'total'>): ConvoySignal {
  const tracked = convoy.tracked ?? [];
  const total = convoy.total || tracked.length;

  if (total > 0 && convoy.completed >= total) {
    return { state: 'done', tone: 'ok', label: 'done', pulse: false };
  }
  if (tracked.some((b) => b.blocked)) {
    return { state: 'blocked', tone: 'warn', label: 'blocked', pulse: false };
  }
  if (tracked.some((b) => ACTIVE_STATUSES.has(String(b.status)))) {
    return { state: 'active', tone: 'accent', label: 'active', pulse: true };
  }
  return { state: 'queued', tone: 'neutral', label: 'queued', pulse: false };
}

const STATE_RANK: Record<ConvoyState, number> = { blocked: 0, active: 1, queued: 2, done: 3 };

/** Most-urgent first; ties broken by recency (newest first). */
export function sortConvoys(convoys: Convoy[]): Convoy[] {
  return [...convoys].sort((a, b) => {
    const byState = STATE_RANK[convoySignal(a).state] - STATE_RANK[convoySignal(b).state];
    if (byState !== 0) return byState;
    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  });
}

/** Distinct agents working a convoy's tracked beads, in first-seen order. */
export function assignees(tracked: TrackedBead[] | null | undefined): string[] {
  const seen = new Set<string>();
  for (const b of tracked ?? []) {
    const a = b.assignee?.trim();
    if (a) seen.add(a);
  }
  return [...seen];
}

/** Short agent label: drop the rig prefix when present ("rig/name" → "name"). */
export function shortAgent(address: string): string {
  const parts = address.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : address;
}

export interface WorkTotals {
  convoys: number;
  inFlight: number;
  blocked: number;
  done: number;
}

/** Roll convoys up into the summary strip counts. */
export function workTotals(convoys: Convoy[]): WorkTotals {
  const totals: WorkTotals = { convoys: convoys.length, inFlight: 0, blocked: 0, done: 0 };
  for (const c of convoys) {
    const { state } = convoySignal(c);
    if (state === 'active') totals.inFlight += 1;
    else if (state === 'blocked') totals.blocked += 1;
    else if (state === 'done') totals.done += 1;
  }
  return totals;
}
