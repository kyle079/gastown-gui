import type { Tone } from '@/components/primitives';
import type { Bead, Formula, PullRequest } from '@/lib/api/types';

/**
 * Pure data helpers for the Catalog surface — search, filter, sort, and the
 * label/tone mappings. Kept free of React so they can be unit-tested and so the
 * view components stay presentational.
 */

function matches(haystack: unknown, needle: string): boolean {
  return String(haystack ?? '')
    .toLowerCase()
    .includes(needle);
}

/** P0 sorts before P4; an unknown/absent priority sorts last. */
function priorityRank(priority: number | undefined): number {
  return typeof priority === 'number' ? priority : Number.MAX_SAFE_INTEGER;
}

/** Display label + tone for a numeric bead priority. */
export function priorityMeta(priority: number | undefined): { label: string; tone: Tone } {
  switch (priority) {
    case 0:
      return { label: 'P0', tone: 'danger' };
    case 1:
      return { label: 'P1', tone: 'warn' };
    case 2:
      return { label: 'P2', tone: 'neutral' };
    case 3:
      return { label: 'P3', tone: 'neutral' };
    default:
      return { label: priority == null ? '—' : `P${priority}`, tone: 'neutral' };
  }
}

/** Tone for a bead status — closed is quiet, blocked shouts. */
export function statusTone(status: string): Tone {
  switch (status) {
    case 'blocked':
      return 'danger';
    case 'in_progress':
    case 'hooked':
      return 'accent';
    case 'open':
      return 'info';
    case 'closed':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Filter by free-text query, then sort by what wants the operator first:
 * highest priority, then most recently touched.
 */
export function filterBeads(beads: Bead[], query: string): Bead[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? beads.filter(
        (b) =>
          matches(b.id, q) ||
          matches(b.title, q) ||
          matches(b.description, q) ||
          matches(b.owner, q) ||
          matches(b.issue_type, q),
      )
    : beads.slice();

  return filtered.sort((a, b) => {
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
    if (byPriority !== 0) return byPriority;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

/** Filter PRs by query (number, title, branch, author), newest first. */
export function filterPullRequests(prs: PullRequest[], query: string): PullRequest[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? prs.filter(
        (p) =>
          matches(p.title, q) ||
          matches(`#${p.number}`, q) ||
          matches(p.headRefName, q) ||
          matches(p.author?.login, q) ||
          matches(p.repo, q),
      )
    : prs.slice();

  return filtered.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** Distinct formula types present in the set (for the filter Select). */
export function formulaTypes(formulas: Formula[]): string[] {
  const seen = new Set<string>();
  for (const f of formulas) {
    if (f.type) seen.add(f.type);
  }
  return [...seen].sort();
}

/** Filter formulas by type and free-text query, sorted by name. */
export function filterFormulas(formulas: Formula[], query: string, type: string): Formula[] {
  const q = query.trim().toLowerCase();
  return formulas
    .filter((f) => (type ? f.type === type : true))
    .filter((f) => (q ? matches(f.name, q) || matches(f.description, q) : true))
    .sort((a, b) => a.name.localeCompare(b.name));
}
