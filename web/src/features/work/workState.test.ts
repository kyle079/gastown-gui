import { describe, it, expect } from 'vitest';
import type { Convoy, TrackedBead } from '@/lib/api/types';
import { assignees, convoySignal, groupConvoysByState, shortAgent, sortConvoys, trackedBeadState, workTotals } from './workState';

function bead(partial: Partial<TrackedBead> = {}): TrackedBead {
  return { id: 'b', title: 't', status: 'open', ...partial };
}

function convoy(partial: Partial<Convoy> = {}): Convoy {
  return { id: 'c', title: 'Work', status: 'open', tracked: [], completed: 0, total: 1, ...partial };
}

describe('convoySignal', () => {
  it('reports done when completed meets total', () => {
    expect(convoySignal({ tracked: [bead({ status: 'closed' })], completed: 1, total: 1 })).toMatchObject({
      state: 'done',
      tone: 'ok',
    });
  });

  it('flags blocked over active', () => {
    const tracked = [bead({ status: 'blocked', blocked: true })];
    expect(convoySignal({ tracked, completed: 0, total: 1 }).state).toBe('blocked');
  });

  it('keeps hooked work active even when the raw blocked flag is true', () => {
    const tracked = [bead({ status: 'hooked', blocked: true })];
    expect(convoySignal({ tracked, completed: 0, total: 1 }).state).toBe('active');
  });

  it('pulses for active (in-flight) work', () => {
    const sig = convoySignal({ tracked: [bead({ status: 'hooked' })], completed: 0, total: 1 });
    expect(sig).toMatchObject({ state: 'active', tone: 'accent', pulse: true });
  });

  it('falls back to queued for untouched open work', () => {
    expect(convoySignal({ tracked: [bead({ status: 'open' })], completed: 0, total: 1 }).state).toBe(
      'queued',
    );
  });
});

describe('trackedBeadState', () => {
  it('derives blocked from status instead of raw blocked truthiness', () => {
    expect(trackedBeadState(bead({ status: 'hooked', blocked: true }))).toBe('active');
    expect(trackedBeadState(bead({ status: 'blocked', blocked: false }))).toBe('blocked');
  });
});

describe('sortConvoys', () => {
  it('orders blocked → active → queued → done, newest first within a tier', () => {
    const blocked = convoy({ id: 'blk', tracked: [bead({ status: 'blocked', blocked: true })] });
    const active = convoy({ id: 'act', tracked: [bead({ status: 'hooked' })] });
    const queuedOld = convoy({ id: 'q1', created_at: '2026-01-01', tracked: [bead()] });
    const queuedNew = convoy({ id: 'q2', created_at: '2026-02-01', tracked: [bead()] });
    const done = convoy({ id: 'dn', completed: 1, total: 1, tracked: [bead({ status: 'closed' })] });

    const order = sortConvoys([done, queuedOld, active, queuedNew, blocked]).map((c) => c.id);
    expect(order).toEqual(['blk', 'act', 'q2', 'q1', 'dn']);
  });
});

describe('groupConvoysByState', () => {
  it('buckets convoys into state lanes using sorted order', () => {
    const blocked = convoy({ id: 'blk', tracked: [bead({ status: 'blocked', blocked: true })] });
    const active = convoy({ id: 'act', tracked: [bead({ status: 'hooked' })] });
    const queued = convoy({ id: 'q', tracked: [bead({ status: 'open' })] });
    const done = convoy({ id: 'dn', completed: 1, total: 1, tracked: [bead({ status: 'closed' })] });

    expect(groupConvoysByState([done, queued, active, blocked])).toEqual({
      blocked: [blocked],
      active: [active],
      queued: [queued],
      done: [done],
    });
  });
});

describe('assignees', () => {
  it('dedupes and drops blanks', () => {
    const tracked = [
      bead({ assignee: 'gastown_gui/chrome' }),
      bead({ assignee: 'gastown_gui/chrome' }),
      bead({ assignee: ' ' }),
      bead({ assignee: 'mayor/' }),
    ];
    expect(assignees(tracked)).toEqual(['gastown_gui/chrome', 'mayor/']);
  });
});

describe('shortAgent', () => {
  it('keeps the leaf segment', () => {
    expect(shortAgent('gastown_gui/polecats/chrome')).toBe('chrome');
    expect(shortAgent('mayor/')).toBe('mayor');
  });
});

describe('workTotals', () => {
  it('rolls convoy states into counts', () => {
    const list = [
      convoy({ tracked: [bead({ status: 'blocked', blocked: true })] }),
      convoy({ tracked: [bead({ status: 'hooked' })] }),
      convoy({ tracked: [bead({ status: 'open' })] }),
      convoy({ completed: 1, total: 1, tracked: [bead({ status: 'closed' })] }),
    ];
    expect(workTotals(list)).toEqual({ convoys: 4, inFlight: 1, blocked: 1, done: 1 });
  });
});
