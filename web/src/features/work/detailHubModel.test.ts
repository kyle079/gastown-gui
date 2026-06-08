import { describe, expect, it } from 'vitest';
import type { Agent, BeadDetail, Convoy, PullRequest } from '@/lib/api/types';
import { buildConvoyHub, buildIssueHub, relatedPullRequests } from './detailHubModel';

function bead(partial: Partial<BeadDetail> = {}): BeadDetail {
  return {
    id: 'gg-1',
    title: 'Action hub task',
    status: 'blocked',
    priority: 1,
    assignee: 'gastown_gui/polecats/obsidian',
    dependencies: [{ id: 'gg-0', title: 'Dependency', status: 'blocked' }],
    ...partial,
  };
}

function convoy(partial: Partial<Convoy> = {}): Convoy {
  return {
    id: 'cv-1',
    title: 'Work: Action hub rollout',
    status: 'open',
    tracked: [{ id: 'gg-1', title: 'Action hub task', status: 'blocked', blocked: true, assignee: 'gastown_gui/polecats/obsidian' }],
    completed: 0,
    total: 1,
    ...partial,
  };
}

function agent(partial: Partial<Agent> = {}): Agent {
  return {
    name: 'obsidian',
    address: 'gastown_gui/polecats/obsidian',
    session: 's',
    role: 'polecat',
    running: true,
    acp: false,
    has_work: true,
    state: 'working',
    unread_mail: 0,
    hook_bead: 'gg-1',
    ...partial,
  };
}

function pr(partial: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 14,
    title: 'feat: action hub for gg-1',
    repo: 'web3dev1337/gastown-gui',
    headRefName: 'polecat/obsidian/gg-1@abc',
    state: 'open',
    reviewDecision: 'CHANGES_REQUESTED',
    updatedAt: '2026-06-08T01:00:00Z',
    ...partial,
  };
}

describe('relatedPullRequests', () => {
  it('matches bead IDs from branch names and titles', () => {
    const matches = relatedPullRequests(
      'gg-1',
      [pr(), pr({ number: 15, title: 'feat: unrelated work', headRefName: 'feature/no-match' })],
    );
    expect(matches.map((item) => item.number)).toEqual([14]);
  });
});

describe('buildIssueHub', () => {
  it('connects convoy, dependency, runtime, and PR actions around a bead', () => {
    const hub = buildIssueHub(bead(), [convoy()], [agent()], [pr()]);

    expect(hub.convoy?.id).toBe('cv-1');
    expect(hub.agent?.name).toBe('obsidian');
    expect(hub.relatedPrs[0]?.number).toBe(14);
    expect(hub.actions.map((action) => action.id)).toEqual([
      'inspect-convoy',
      'inspect-dependency',
      'inspect-rig',
      'review-pr',
    ]);
  });
});

describe('buildConvoyHub', () => {
  it('surfaces blocked bead and operator context as next actions', () => {
    const hub = buildConvoyHub(convoy(), [agent()]);

    expect(hub.blocked.map((item) => item.id)).toEqual(['gg-1']);
    expect(hub.operators.map((item) => item.name)).toEqual(['obsidian']);
    expect(hub.actions.map((action) => action.id)).toEqual([
      'inspect-blocked-bead',
      'inspect-operator-rig',
    ]);
  });
});
