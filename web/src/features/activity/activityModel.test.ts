import { describe, it, expect } from 'vitest';
import { toActivityView, matchesQuery } from './activityModel';
import type { ActivityEvent } from '@/lib/api/types';

function ev(partial: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: 'x',
    ts: '2026-06-06T00:00:00Z',
    type: 'mail',
    actor: 'mayor',
    source: 'gt',
    payload: {},
    ...partial,
  };
}

describe('toActivityView', () => {
  it('maps escalation_sent to the escalation category with severity + reason', () => {
    const v = toActivityView(
      ev({
        type: 'escalation_sent',
        actor: 'deacon/dogs/alpha',
        payload: { severity: 'critical', reason: 'SMTP down', to: 'mayor' },
      }),
    );
    expect(v.category).toBe('escalation');
    expect(v.tone).toBe('danger');
    expect(v.target).toBe('mayor');
    expect(v.detail).toBe('critical · SMTP down');
  });

  it('maps done to a work row carrying the bead and branch', () => {
    const v = toActivityView(
      ev({ type: 'done', actor: 'rig/polecats/rust', payload: { bead: 'gg-oo7', branch: 'b@mq' } }),
    );
    expect(v.category).toBe('work');
    expect(v.tone).toBe('ok');
    expect(v.label).toBe('done');
    expect(v.target).toBe('gg-oo7');
    expect(v.detail).toBe('b@mq');
  });

  it('maps sling target with an arrow', () => {
    const v = toActivityView(ev({ type: 'sling', payload: { bead: 'gg-1', target: 'rig/polecats/x' } }));
    expect(v.target).toBe('gg-1');
    expect(v.detail).toBe('→ rig/polecats/x');
  });

  it('treats mail and nudge as comms', () => {
    expect(toActivityView(ev({ type: 'mail', payload: { subject: 'hi', to: 'witness' } }))).toMatchObject({
      category: 'comms',
      target: 'witness',
      detail: 'hi',
    });
    expect(toActivityView(ev({ type: 'nudge', payload: { target: 'hq-mayor', reason: 'landed' } }))).toMatchObject({
      category: 'comms',
      target: 'hq-mayor',
      detail: 'landed',
    });
  });

  it('treats session lifecycle as the session category', () => {
    expect(toActivityView(ev({ type: 'session_start' })).category).toBe('session');
    expect(toActivityView(ev({ type: 'session_death', payload: { reason: 'idle-reap' } })).detail).toBe('idle-reap');
  });

  it('falls back to a humanized system row for unknown types', () => {
    const v = toActivityView(ev({ type: 'some_new_event', actor: null }));
    expect(v.category).toBe('system');
    expect(v.label).toBe('some new event');
    expect(v.actor).toBe('system');
  });

  it('omits detail when the payload field is missing', () => {
    expect(toActivityView(ev({ type: 'done', payload: { bead: 'gg-9' } })).detail).toBeUndefined();
  });
});

describe('matchesQuery', () => {
  const v = toActivityView(
    ev({ type: 'done', actor: 'rig/polecats/rust', payload: { bead: 'gg-oo7', branch: 'main' } }),
  );

  it('matches across actor, target and detail, case-insensitively', () => {
    expect(matchesQuery(v, 'RUST')).toBe(true);
    expect(matchesQuery(v, 'gg-oo7')).toBe(true);
    expect(matchesQuery(v, 'main')).toBe(true);
    expect(matchesQuery(v, 'nope')).toBe(false);
  });

  it('matches everything on an empty query', () => {
    expect(matchesQuery(v, '   ')).toBe(true);
  });
});
