import type { Agent } from '@/lib/api/types';
import type { Tone } from '@/components/primitives';

export interface AgentSignal {
  tone: Tone;
  label: string;
  /** Live pulse for actively-working agents. */
  pulse: boolean;
}

/** Map an agent's running/state into a calm, legible signal. */
export function agentSignal(agent: Pick<Agent, 'running' | 'state' | 'has_work'>): AgentSignal {
  if (!agent.running) return { tone: 'neutral', label: 'offline', pulse: false };
  switch (agent.state) {
    case 'working':
      return { tone: 'accent', label: 'working', pulse: true };
    case 'stalled':
      return { tone: 'danger', label: 'stalled', pulse: false };
    case 'blocked':
      return { tone: 'warn', label: 'blocked', pulse: false };
    case 'idle':
      return agent.has_work
        ? { tone: 'info', label: 'hooked', pulse: false }
        : { tone: 'ok', label: 'idle', pulse: false };
    default:
      return { tone: 'ok', label: agent.state || 'online', pulse: false };
  }
}
