import type { Agent, Rig } from '@/lib/api/types';
import type { Tone } from '@/components/primitives';
import { pluralize } from '@/lib/utils/format';

/**
 * Fleet health, derived — not stored. A rig's at-a-glance signal answers one
 * question: does this rig need the operator? Severity wins, so a single stalled
 * polecat outranks a fleet of happily-working ones.
 */
export interface RigHealth {
  tone: Tone;
  /** One-word state for the pill. */
  label: string;
  /** Live pulse when work is actively moving. */
  pulse: boolean;
  /** Specifics that earned attention, most severe first. Empty when all clear. */
  issues: string[];
  running: number;
  total: number;
}

function agents(rig: Rig): Agent[] {
  return (rig.agents ?? []).filter(Boolean);
}

export function rigHealth(rig: Rig): RigHealth {
  const list = agents(rig);
  const running = list.filter((a) => a.running).length;
  const total = list.length;

  const stalled = list.filter((a) => a.running && a.state === 'stalled').length;
  const blocked = list.filter((a) => a.running && a.state === 'blocked').length;
  const working = list.filter((a) => a.running && a.state === 'working').length;

  // Most severe first — this list also reads top-down in the detail view.
  const issues: string[] = [];
  if (stalled > 0) issues.push(pluralize(stalled, 'agent') + ' stalled');
  if (blocked > 0) issues.push(pluralize(blocked, 'agent') + ' blocked');
  if (!rig.has_witness) issues.push('no witness');
  if (!rig.has_refinery) issues.push('no refinery');

  if (stalled > 0) return { tone: 'danger', label: 'stalled', pulse: false, issues, running, total };
  if (issues.length > 0) return { tone: 'warn', label: 'degraded', pulse: false, issues, running, total };
  if (working > 0) return { tone: 'accent', label: 'active', pulse: true, issues, running, total };
  if (running > 0) return { tone: 'ok', label: 'healthy', pulse: false, issues, running, total };
  return { tone: 'neutral', label: 'offline', pulse: false, issues, running, total };
}

export interface RigAgentGroups {
  /** witness + refinery — the rig's permanent services. */
  services: Agent[];
  polecats: Agent[];
  crew: Agent[];
  /** Anything that doesn't fit the above buckets, so nothing is silently dropped. */
  other: Agent[];
}

/** Bucket a rig's agents by role for the drill-in view. */
export function groupRigAgents(rig: Rig): RigAgentGroups {
  const groups: RigAgentGroups = { services: [], polecats: [], crew: [], other: [] };
  for (const a of agents(rig)) {
    switch (a.role) {
      case 'witness':
      case 'refinery':
        groups.services.push(a);
        break;
      case 'polecat':
        groups.polecats.push(a);
        break;
      case 'crew':
        groups.crew.push(a);
        break;
      default:
        groups.other.push(a);
    }
  }
  // Services read witness-before-refinery; the rest keep source order.
  groups.services.sort((a, b) => a.role.localeCompare(b.role));
  return groups;
}

/** Fleet-level sort: rigs that need the operator float up; ties broken by size. */
const HEALTH_RANK: Record<string, number> = {
  stalled: 0,
  degraded: 1,
  active: 2,
  healthy: 3,
  offline: 4,
};

export function compareRigs(a: Rig, b: Rig): number {
  const ha = rigHealth(a);
  const hb = rigHealth(b);
  const byHealth = (HEALTH_RANK[ha.label] ?? 9) - (HEALTH_RANK[hb.label] ?? 9);
  if (byHealth !== 0) return byHealth;
  if (hb.total !== ha.total) return hb.total - ha.total;
  return a.name.localeCompare(b.name);
}
