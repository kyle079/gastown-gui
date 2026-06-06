import { describe, it, expect } from 'vitest';
import { rigHealth, groupRigAgents, compareRigs } from './rigHealth';
import type { Agent, Rig } from '@/lib/api/types';

function agent(partial: Partial<Agent>): Agent {
  return {
    name: 'a',
    address: 'rig/a',
    session: 's',
    role: 'polecat',
    running: true,
    acp: false,
    has_work: false,
    state: 'idle',
    unread_mail: 0,
    ...partial,
  };
}

function rig(partial: Partial<Rig>): Rig {
  return {
    name: 'rig',
    polecats: null,
    polecat_count: 0,
    crews: null,
    crew_count: 0,
    has_witness: true,
    has_refinery: true,
    agents: [],
    ...partial,
  };
}

describe('rigHealth', () => {
  it('is offline when nothing is running', () => {
    const h = rigHealth(rig({ agents: [agent({ running: false })] }));
    expect(h).toMatchObject({ tone: 'neutral', label: 'offline', pulse: false });
    expect(h.issues).toEqual([]);
  });

  it('is healthy when agents run idle', () => {
    expect(rigHealth(rig({ agents: [agent({ running: true, state: 'idle' })] }))).toMatchObject({
      tone: 'ok',
      label: 'healthy',
    });
  });

  it('pulses when an agent is working', () => {
    expect(rigHealth(rig({ agents: [agent({ state: 'working' })] }))).toMatchObject({
      tone: 'accent',
      label: 'active',
      pulse: true,
    });
  });

  it('stalled outranks working', () => {
    const h = rigHealth(
      rig({ agents: [agent({ state: 'working' }), agent({ state: 'stalled' })] }),
    );
    expect(h.tone).toBe('danger');
    expect(h.label).toBe('stalled');
    expect(h.issues[0]).toBe('1 agent stalled');
  });

  it('flags missing services as degraded', () => {
    const h = rigHealth(rig({ has_refinery: false, agents: [agent({ state: 'working' })] }));
    expect(h.tone).toBe('warn');
    expect(h.issues).toContain('no refinery');
  });

  it('counts running vs total', () => {
    const h = rigHealth(
      rig({ agents: [agent({ running: true }), agent({ running: false }), agent({ running: true })] }),
    );
    expect(h.running).toBe(2);
    expect(h.total).toBe(3);
  });
});

describe('groupRigAgents', () => {
  it('buckets by role and orders witness before refinery', () => {
    const groups = groupRigAgents(
      rig({
        agents: [
          agent({ role: 'refinery' }),
          agent({ role: 'witness' }),
          agent({ role: 'polecat' }),
          agent({ role: 'crew' }),
          agent({ role: 'mystery' }),
        ],
      }),
    );
    expect(groups.services.map((a) => a.role)).toEqual(['refinery', 'witness'].sort());
    expect(groups.services[0].role).toBe('refinery');
    expect(groups.polecats).toHaveLength(1);
    expect(groups.crew).toHaveLength(1);
    expect(groups.other).toHaveLength(1);
  });
});

describe('compareRigs', () => {
  it('floats rigs that need attention above healthy ones', () => {
    const healthy = rig({ name: 'calm', agents: [agent({ state: 'idle' })] });
    const broken = rig({ name: 'broken', agents: [agent({ state: 'stalled' })] });
    expect([healthy, broken].sort(compareRigs)[0].name).toBe('broken');
  });

  it('breaks health ties by agent count', () => {
    const small = rig({ name: 'small', agents: [agent({ state: 'idle' })] });
    const big = rig({ name: 'big', agents: [agent({ state: 'idle' }), agent({ state: 'idle' })] });
    expect([small, big].sort(compareRigs)[0].name).toBe('big');
  });
});
