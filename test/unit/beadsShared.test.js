import { describe, expect, it } from 'vitest';

import { DEFAULT_BEAD_PRIORITY, getBeadPriority, sortWorkBeads } from '../../js/shared/beads.js';

describe('beads shared', () => {
  it('defaults missing/invalid priorities', () => {
    expect(DEFAULT_BEAD_PRIORITY).toBe(2);
    expect(getBeadPriority()).toBe(2);
    expect(getBeadPriority(null)).toBe(2);
    expect(getBeadPriority({})).toBe(2);
    expect(getBeadPriority({ priority: 0 })).toBe(2);
    expect(getBeadPriority({ priority: 'nope' })).toBe(2);
  });

  it('normalizes numeric and numeric-string priorities', () => {
    expect(getBeadPriority({ priority: 5 })).toBe(5);
    expect(getBeadPriority({ priority: '4' })).toBe(4);
  });
});

describe('sortWorkBeads', () => {
  const ids = (beads) => beads.map(b => b.id);

  it('returns an empty array for non-array input', () => {
    expect(sortWorkBeads(undefined)).toEqual([]);
    expect(sortWorkBeads(null)).toEqual([]);
    expect(sortWorkBeads('nope')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [
      { id: 'a', status: 'closed' },
      { id: 'b', status: 'in_progress' },
    ];
    const result = sortWorkBeads(input);
    expect(ids(input)).toEqual(['a', 'b']);
    expect(ids(result)).toEqual(['b', 'a']);
  });

  it('orders by status: in-progress, open, blocked, then closed', () => {
    const beads = [
      { id: 'closed', status: 'closed' },
      { id: 'blocked', status: 'blocked' },
      { id: 'open', status: 'open' },
      { id: 'wip', status: 'in_progress' },
    ];
    expect(ids(sortWorkBeads(beads))).toEqual(['wip', 'open', 'blocked', 'closed']);
  });

  it('treats in-progress and in_progress identically', () => {
    const beads = [
      { id: 'open', status: 'open' },
      { id: 'hyphen', status: 'in-progress' },
    ];
    expect(ids(sortWorkBeads(beads))).toEqual(['hyphen', 'open']);
  });

  it('sorts by priority (P0 first) within the same status', () => {
    const beads = [
      { id: 'p2', status: 'open', priority: 2 },
      { id: 'p0', status: 'open', priority: 0 },
      { id: 'p1', status: 'open', priority: 1 },
    ];
    // priority 0 normalizes to DEFAULT (2); priority 1 stays highest urgency.
    expect(ids(sortWorkBeads(beads))).toEqual(['p1', 'p2', 'p0']);
  });

  it('breaks priority ties with most-recently-created first', () => {
    const beads = [
      { id: 'older', status: 'open', priority: 1, created_at: '2026-01-01T00:00:00Z' },
      { id: 'newer', status: 'open', priority: 1, created_at: '2026-06-01T00:00:00Z' },
    ];
    expect(ids(sortWorkBeads(beads))).toEqual(['newer', 'older']);
  });

  it('places unknown statuses between open and blocked', () => {
    const beads = [
      { id: 'blocked', status: 'blocked' },
      { id: 'mystery', status: 'whatever' },
      { id: 'open', status: 'open' },
    ];
    expect(ids(sortWorkBeads(beads))).toEqual(['open', 'mystery', 'blocked']);
  });
});

