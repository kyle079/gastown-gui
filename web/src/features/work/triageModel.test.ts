import { describe, expect, it } from 'vitest';
import type { Bead, Convoy, SchedulerStatus, TrackedBead } from '@/lib/api/types';
import { collectNextActions, collectWorkAttention, triageBeads } from './triageModel';

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

function tracked(partial: Partial<TrackedBead> = {}): TrackedBead {
  return { id: 'gg-1', title: 'Tracked', status: 'open', ...partial };
}

function convoy(partial: Partial<Convoy> = {}): Convoy {
  return {
    id: 'cv-1',
    title: 'Work: Triage',
    status: 'open',
    tracked: [],
    completed: 0,
    total: 1,
    ...partial,
  };
}

function scheduler(partial: Partial<SchedulerStatus> = {}): SchedulerStatus {
  return {
    paused: false,
    queued_total: 0,
    queued_ready: 0,
    active_polecats: 0,
    beads: null,
    capacity: {
      max: 4,
      working: 1,
      recovery_blocked: 0,
      reusable_idle: 0,
      pending_mr: 0,
      reservations: 0,
      free: 3,
      active_sessions: 1,
    },
    ...partial,
  };
}

describe('triageBeads', () => {
  it('orders blocked and active work ahead of untouched open work', () => {
    const rows = triageBeads([
      bead({ id: 'open', status: 'open', priority: 1 }),
      bead({ id: 'active', status: 'hooked', priority: 4 }),
      bead({ id: 'blocked', status: 'blocked', priority: 4 }),
      bead({ id: 'closed', status: 'closed', priority: 0 }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['blocked', 'active', 'open']);
  });
});

describe('collectWorkAttention', () => {
  it('surfaces blocked convoys and scheduler saturation first', () => {
    const items = collectWorkAttention(
      [convoy({ title: 'Work: Convoy Alpha', tracked: [tracked({ blocked: true })] })],
      [bead({ id: 'gg-9', priority: 0 })],
      scheduler({ queued_ready: 2, capacity: { ...scheduler().capacity, free: 0 } }),
    );

    expect(items.map((item) => item.id)).toEqual([
      'blocked-convoys',
      'scheduler-saturated',
      'urgent-open-beads',
    ]);
  });

  it('falls back to an all-clear state when nothing needs intervention', () => {
    const items = collectWorkAttention(
      [convoy({ tracked: [tracked({ status: 'hooked' })] })],
      [bead({ status: 'closed' })],
      scheduler(),
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'all-clear',
        tone: 'ok',
      }),
    ]);
  });
});

describe('collectNextActions', () => {
  it('recommends dispatch when capacity is free and ready work exists', () => {
    const actions = collectNextActions(
      [],
      [bead({ id: 'gg-2', title: 'Triage board polish', priority: 1 })],
      scheduler({ queued_ready: 2, capacity: { ...scheduler().capacity, free: 2 } }),
    );

    expect(actions.map((action) => action.id)).toContain('dispatch-ready');
    expect(actions.map((action) => action.id)).toContain('review-urgent');
  });

  it('falls back to steady-state when the board is already moving', () => {
    const actions = collectNextActions(
      [convoy({ tracked: [tracked({ status: 'hooked' })] })],
      [],
      scheduler(),
    );

    expect(actions).toEqual([
      expect.objectContaining({
        id: 'steady-state',
        tone: 'ok',
      }),
    ]);
  });
});
