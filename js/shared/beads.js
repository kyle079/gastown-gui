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

