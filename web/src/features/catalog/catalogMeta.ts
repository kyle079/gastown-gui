import type { Tone } from '@/components/primitives';
import type { Bead, PullRequest } from '@/lib/api/types';

/**
 * Pure presentation mappers for the catalog surface — beads priority/status and
 * PR review state to design-system tones + labels. Kept dependency-free and
 * unit-tested so the visual signal stays consistent and refactor-safe.
 */

/** `P0`…`P4` label for a numeric beads priority. */
export function priorityLabel(priority: number | undefined): string {
  if (priority == null || Number.isNaN(priority)) return 'P—';
  const clamped = Math.max(0, Math.min(4, Math.round(priority)));
  return `P${clamped}`;
}

/** Lower numeric priority = more urgent = louder tone. */
export function priorityTone(priority: number | undefined): Tone {
  switch (priority) {
    case 0:
      return 'danger';
    case 1:
      return 'warn';
    case 2:
      return 'info';
    default:
      return 'neutral';
  }
}

/** Beads workflow status → tone. Active work is accented; terminal states calm. */
export function statusTone(status: string | undefined): Tone {
  switch (status) {
    case 'in_progress':
    case 'hooked':
    case 'pinned':
      return 'accent';
    case 'blocked':
      return 'warn';
    case 'open':
      return 'info';
    case 'closed':
      return 'ok';
    case 'deferred':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/** Snake/kebab status → display label ("in_progress" → "in progress"). */
export function statusLabel(status: string | undefined): string {
  if (!status) return 'unknown';
  return status.replace(/[_-]+/g, ' ');
}

export interface PrReview {
  label: string;
  tone: Tone;
}

/**
 * Collapse a PR's draft flag + review decision into a single status chip.
 * Draft dominates; then an explicit review verdict; else "open".
 */
export function prReview(pr: Pick<PullRequest, 'isDraft' | 'reviewDecision'>): PrReview {
  if (pr.isDraft) return { label: 'draft', tone: 'neutral' };
  switch (pr.reviewDecision) {
    case 'APPROVED':
      return { label: 'approved', tone: 'ok' };
    case 'CHANGES_REQUESTED':
      return { label: 'changes', tone: 'danger' };
    case 'REVIEW_REQUIRED':
      return { label: 'review', tone: 'warn' };
    default:
      return { label: 'open', tone: 'info' };
  }
}

/** Sort beads by urgency (priority asc) then most-recently-updated first. */
export function byUrgency(a: Bead, b: Bead): number {
  const pa = a.priority ?? 99;
  const pb = b.priority ?? 99;
  if (pa !== pb) return pa - pb;
  const ua = a.updated_at ? new Date(a.updated_at).getTime() : 0;
  const ub = b.updated_at ? new Date(b.updated_at).getTime() : 0;
  return ub - ua;
}
