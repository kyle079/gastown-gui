/**
 * Gas Town GUI - Bead helpers
 */

export const DEFAULT_BEAD_PRIORITY = 2;

const HIDDEN_WORK_TYPES = new Set(['message', 'convoy', 'agent', 'gate', 'role', 'event', 'slot']);
const INTERNAL_WISP_ID_RE = /^[a-z0-9]+-wisp-/i;

/**
 * Normalize a bead's priority for display.
 * @param {object} bead
 * @returns {number}
 */
export function getBeadPriority(bead) {
  const raw = bead?.priority;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BEAD_PRIORITY;
}

export function isUserVisibleWorkBead(bead) {
  if (!bead) return false;
  if (HIDDEN_WORK_TYPES.has(bead.issue_type)) return false;
  if (INTERNAL_WISP_ID_RE.test(String(bead.id || ''))) return false;
  return true;
}

// Lower weight sorts first. Actionable, in-flight work surfaces above
// not-yet-started work, blocked work sinks below ready work, and completed
// work always trails the open queue.
const STATUS_SORT_WEIGHT = {
  in_progress: 0,
  'in-progress': 0,
  open: 1,
  blocked: 2,
  closed: 3,
};
const DEFAULT_STATUS_WEIGHT = 1.5; // unknown statuses sit between open and blocked

function statusWeight(bead) {
  const status = bead?.status;
  return status in STATUS_SORT_WEIGHT ? STATUS_SORT_WEIGHT[status] : DEFAULT_STATUS_WEIGHT;
}

function createdMillis(bead) {
  const value = Date.parse(bead?.created_at ?? '');
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Sort work beads for display in the Open Tasks / Work view.
 *
 * Order: status (active work first), then priority (P0 → P4),
 * then most-recently-created first. Returns a new array; the input is
 * not mutated.
 *
 * @param {Array} beads
 * @returns {Array}
 */
export function sortWorkBeads(beads) {
  if (!Array.isArray(beads)) return [];
  return [...beads].sort((a, b) => {
    const statusDiff = statusWeight(a) - statusWeight(b);
    if (statusDiff !== 0) return statusDiff;

    const priorityDiff = getBeadPriority(a) - getBeadPriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    return createdMillis(b) - createdMillis(a);
  });
}

