import { describe, it, expect } from 'vitest';
import {
  beadState,
  convoySignal,
  convoyProgress,
  compareConvoys,
  summarizeQueue,
  shortAssignee,
  convoyTitle,
} from './convoyQueue';
import type { Convoy, TrackedBead } from '@/lib/api/types';

function bead(partial: Partial<TrackedBead>): TrackedBead {
  return { id: 'b', title: 'bead', status: 'open', ...partial };
}

function convoy(partial: Partial<Convoy>): Convoy {
  return {
    id: 'cv',
    title: 'Work: thing',
    status: 'open',
    tracked: [],
    completed: 0,
    total: 0,
    ...partial,
  };
}

describe('beadState', () => {
  it('maps lifecycle to a work state', () => {
    expect(beadState(bead({ status: 'closed' }))).toBe('done');
    expect(beadState(bead({ status: 'in_progress' }))).toBe('active');
    expect(beadState(bead({ status: 'hooked' }))).toBe('active');
    expect(beadState(bead({ status: 'open', blocked: true }))).toBe('blocked');
    expect(beadState(bead({ status: 'open' }))).toBe('queued');
  });
});

describe('convoySignal', () => {
  it('is done when the convoy is closed', () => {
    expect(convoySignal(convoy({ status: 'closed' }))).toMatchObject({ label: 'done', pulse: false });
  });

  it('is done when every bead is complete', () => {
    expect(convoySignal(convoy({ total: 2, completed: 2 }))).toMatchObject({ label: 'done' });
  });

  it('pulses when a bead is actively worked', () => {
    const c = convoy({ total: 1, tracked: [bead({ status: 'hooked' })] });
    expect(convoySignal(c)).toMatchObject({ tone: 'accent', label: 'active', pulse: true });
  });

  it('blocked outranks active', () => {
    const c = convoy({
      total: 2,
      tracked: [bead({ status: 'hooked' }), bead({ status: 'open', blocked: true })],
    });
    expect(convoySignal(c).label).toBe('blocked');
    expect(convoySignal(c).tone).toBe('warn');
  });

  it('treats a waiting open convoy as queued', () => {
    expect(convoySignal(convoy({ total: 1, tracked: [bead({ status: 'open' })] })).label).toBe(
      'queued',
    );
  });
});

describe('convoyProgress', () => {
  it('is a clamped fraction', () => {
    expect(convoyProgress(convoy({ total: 4, completed: 1 }))).toBe(0.25);
    expect(convoyProgress(convoy({ total: 0, completed: 0 }))).toBe(0);
    expect(convoyProgress(convoy({ total: 2, completed: 5 }))).toBe(1);
  });
});

describe('compareConvoys', () => {
  it('floats convoys that need the operator above finished ones', () => {
    const done = convoy({ id: 'done', status: 'closed' });
    const blocked = convoy({ id: 'blk', total: 1, tracked: [bead({ blocked: true })] });
    expect([done, blocked].sort(compareConvoys)[0].id).toBe('blk');
  });

  it('breaks state ties by most remaining work', () => {
    const small = convoy({ id: 'small', total: 2, completed: 1, tracked: [bead({ status: 'open' })] });
    const big = convoy({ id: 'big', total: 5, completed: 0, tracked: [bead({ status: 'open' })] });
    expect([small, big].sort(compareConvoys)[0].id).toBe('big');
  });

  it('orders blocked before active before queued before done', () => {
    const blocked = convoy({ id: 'a', total: 1, tracked: [bead({ blocked: true })] });
    const active = convoy({ id: 'b', total: 1, tracked: [bead({ status: 'hooked' })] });
    const queued = convoy({ id: 'c', total: 1, tracked: [bead({ status: 'open' })] });
    const done = convoy({ id: 'd', status: 'closed' });
    const order = [done, queued, active, blocked].sort(compareConvoys).map((c) => c.id);
    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('summarizeQueue', () => {
  it('tallies convoys by headline state', () => {
    const s = summarizeQueue([
      convoy({ status: 'closed' }),
      convoy({ total: 1, tracked: [bead({ status: 'hooked' })] }),
      convoy({ total: 1, tracked: [bead({ blocked: true })] }),
    ]);
    expect(s).toMatchObject({ done: 1, active: 1, blocked: 1, queued: 0, total: 3 });
  });
});

describe('convoyTitle', () => {
  it('strips the redundant Work: prefix', () => {
    expect(convoyTitle(convoy({ title: 'Work: Phase 1 — Mail' }))).toBe('Phase 1 — Mail');
    expect(convoyTitle(convoy({ title: 'Standalone title' }))).toBe('Standalone title');
  });
});

describe('shortAssignee', () => {
  it('takes the last segment of a routing address', () => {
    expect(shortAssignee('gastown_gui/polecats/rust')).toBe('rust');
    expect(shortAssignee('mayor/')).toBe('mayor');
    expect(shortAssignee(null)).toBeNull();
  });
});
