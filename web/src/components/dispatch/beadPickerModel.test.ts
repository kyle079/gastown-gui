import { describe, expect, it } from 'vitest';
import type { Bead, Target } from '@/lib/api/types';
import { buildDispatchBrowseList, targetOptionLabel } from './beadPickerModel';

function bead(partial: Partial<Bead> = {}): Bead {
  return {
    id: 'gg-1',
    title: 'Bead',
    status: 'open',
    priority: 2,
    updated_at: '2026-06-07T00:00:00Z',
    ...partial,
  };
}

function target(partial: Partial<Target> = {}): Target {
  return {
    id: 'gastown_gui',
    name: 'gastown_gui',
    type: 'rig',
    ...partial,
  };
}

describe('buildDispatchBrowseList', () => {
  it('prioritizes blocked and active beads, and omits closed work', () => {
    const rows = buildDispatchBrowseList([
      bead({ id: 'open', status: 'open', priority: 1 }),
      bead({ id: 'hooked', status: 'hooked', priority: 4 }),
      bead({ id: 'blocked', status: 'blocked', priority: 4 }),
      bead({ id: 'closed', status: 'closed', priority: 0 }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['blocked', 'hooked', 'open']);
  });

  it('dedupes repeated bead ids', () => {
    const rows = buildDispatchBrowseList([
      bead({ id: 'gg-2', title: 'First copy' }),
      bead({ id: 'gg-2', title: 'Second copy' }),
      bead({ id: 'gg-3' }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['gg-2', 'gg-3']);
    expect(rows[0].title).toBe('First copy');
  });
});

describe('targetOptionLabel', () => {
  it('includes role and runtime state when present', () => {
    expect(
      targetOptionLabel(
        target({ name: 'jasper', type: 'agent', role: 'polecat', running: true, has_work: false }),
      ),
    ).toBe('jasper · polecat · idle');
  });

  it('falls back to target type when no role is provided', () => {
    expect(targetOptionLabel(target({ name: 'mayor', type: 'global', running: false }))).toBe(
      'mayor · global · stopped',
    );
  });
});
