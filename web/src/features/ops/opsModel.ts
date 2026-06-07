import type { Tone } from '@/components/primitives';
import type { Agent, Escalation, ReadyResponse, Target, TownStatus } from '@/lib/api/types';

export interface AttentionItem {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  nextAction: string;
  route: string;
  agentAddress?: string;
}

export function allAgents(status: TownStatus): Agent[] {
  return [
    ...(status.agents ?? []),
    ...(status.rigs ?? []).flatMap((rig) => rig.agents ?? []),
  ];
}

function escalationTone(priority?: number): Tone {
  if (priority != null && priority <= 1) return 'danger';
  if (priority === 2) return 'warn';
  return 'info';
}

function toneRank(tone: Tone): number {
  switch (tone) {
    case 'danger':
      return 0;
    case 'warn':
      return 1;
    case 'accent':
      return 2;
    case 'info':
      return 3;
    case 'ok':
      return 4;
    default:
      return 5;
  }
}

export function collectAttentionItems(
  status: TownStatus,
  escalations: Escalation[],
  ready: ReadyResponse | null,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const agent of allAgents(status)) {
    if (agent.state === 'stalled' || agent.state === 'blocked') {
      items.push({
        id: `agent:${agent.address}`,
        tone: agent.state === 'stalled' ? 'danger' : 'warn',
        title: agent.address || agent.name,
        detail: agent.hook_bead ? `${agent.state} on ${agent.hook_bead}` : agent.state,
        nextAction: 'Inspect agent',
        route: '/ops',
        agentAddress: agent.address,
      });
    }
  }

  for (const rig of status.rigs ?? []) {
    if (!rig.has_witness) {
      items.push({
        id: `wit:${rig.name}`,
        tone: 'warn',
        title: rig.name,
        detail: 'Witness missing',
        nextAction: 'Open rig',
        route: '/rigs',
      });
    }
    if (!rig.has_refinery) {
      items.push({
        id: `ref:${rig.name}`,
        tone: 'warn',
        title: rig.name,
        detail: 'Refinery missing',
        nextAction: 'Open rig',
        route: '/rigs',
      });
    }
  }

  if ((status.overseer?.unread_mail ?? 0) > 0) {
    items.push({
      id: 'mail',
      tone: 'info',
      title: 'Overseer mail',
      detail: `${status.overseer.unread_mail} unread`,
      nextAction: 'Open mail',
      route: '/mail',
    });
  }

  for (const escalation of escalations) {
    items.push({
      id: `esc:${escalation.id}`,
      tone: escalationTone(escalation.priority),
      title: escalation.title,
      detail: escalation.id,
      nextAction: 'Open escalations',
      route: '/escalations',
    });
  }

  for (const source of ready?.sources ?? []) {
    if ((source.issues ?? []).length === 0) continue;
    items.push({
      id: `ready:${source.name}`,
      tone: 'accent',
      title: source.name,
      detail: `${source.issues.length} ready issue${source.issues.length === 1 ? '' : 's'}`,
      nextAction: 'Open review queue',
      route: '/ops',
    });
  }

  return items.sort((a, b) => toneRank(a.tone) - toneRank(b.tone));
}

function targetScore(target: Target): number {
  let score = 0;
  if (target.type === 'agent') score += 30;
  if (target.type === 'rig') score += 20;
  if (target.running) score += 15;
  if (target.has_work === false) score += 10;
  if (target.role === 'polecat') score += 5;
  return score;
}

export function rankTargets(targets: Target[]): Target[] {
  return [...targets].sort((a, b) => {
    const diff = targetScore(b) - targetScore(a);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export function compactAddress(value?: string | null): string {
  if (!value) return '—';
  const parts = value.split('/');
  return parts.length > 2 ? `${parts[0]}/${parts[parts.length - 1]}` : value;
}

export function rigFromAddress(value?: string | null): string | null {
  if (!value) return null;
  const [rig] = value.split('/');
  return rig || null;
}
