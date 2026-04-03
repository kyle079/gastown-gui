import { describe, expect, it } from 'vitest';

import { normalizeRigAgents } from '../../server/domain/agents/normalizeRigAgents.js';

describe('normalizeRigAgents', () => {
  it('preserves explicit rig agents', () => {
    expect(normalizeRigAgents({
      name: 'rig-one',
      agents: [{ name: 'agent-a', role: 'polecat' }],
    })).toEqual([
      {
        name: 'agent-a',
        role: 'polecat',
        address: 'rig-one/agent-a',
        rig: 'rig-one',
      },
    ]);
  });

  it('falls back to hook-shaped rig payloads', () => {
    expect(normalizeRigAgents({
      name: 'rig-one',
      hooks: [{ agent: 'rig-one/agent-a', role: 'polecat' }],
    })).toEqual([
      {
        agent: 'rig-one/agent-a',
        role: 'polecat',
        address: 'rig-one/agent-a',
        name: 'agent-a',
        rig: 'rig-one',
      },
    ]);
  });
});
