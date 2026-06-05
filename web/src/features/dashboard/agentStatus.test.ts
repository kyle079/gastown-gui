import { describe, it, expect } from 'vitest';
import { agentSignal } from './agentStatus';

describe('agentSignal', () => {
  it('treats not-running agents as offline', () => {
    expect(agentSignal({ running: false, state: 'working', has_work: true })).toMatchObject({
      tone: 'neutral',
      label: 'offline',
      pulse: false,
    });
  });

  it('pulses for working agents', () => {
    expect(agentSignal({ running: true, state: 'working', has_work: true })).toMatchObject({
      tone: 'accent',
      pulse: true,
    });
  });

  it('distinguishes idle vs hooked', () => {
    expect(agentSignal({ running: true, state: 'idle', has_work: false }).label).toBe('idle');
    expect(agentSignal({ running: true, state: 'idle', has_work: true }).label).toBe('hooked');
  });

  it('flags stalled and blocked', () => {
    expect(agentSignal({ running: true, state: 'stalled', has_work: false }).tone).toBe('danger');
    expect(agentSignal({ running: true, state: 'blocked', has_work: false }).tone).toBe('warn');
  });
});
