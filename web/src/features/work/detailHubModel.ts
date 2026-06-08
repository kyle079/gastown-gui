import type { Tone } from '@/components/primitives';
import type { Agent, BeadDetail, Convoy, PullRequest, TrackedBead } from '@/lib/api/types';
import { convoySignal, trackedBeadState } from './workState';

export type TaskActionTarget =
  | { kind: 'work' }
  | { kind: 'issue'; issueId: string }
  | { kind: 'convoy'; convoyId: string }
  | { kind: 'rig'; rig: string }
  | { kind: 'pr'; owner: string; repo: string; prNumber: number }
  | { kind: 'prs'; q: string };

export interface TaskAction {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  cta: string;
  target: TaskActionTarget;
}

export interface RelatedPullRequest {
  owner: string;
  repo: string;
  repoFullName: string;
  number: number;
  title: string;
  rig?: string;
  state?: string;
  reviewDecision?: string;
  updatedAt?: string;
  headRefName?: string;
  isDraft?: boolean;
}

export interface IssueHubState {
  convoy: Convoy | null;
  agent: Agent | null;
  rig: string | null;
  relatedPrs: RelatedPullRequest[];
  actions: TaskAction[];
}

export interface ConvoyHubState {
  blocked: TrackedBead[];
  active: TrackedBead[];
  queued: TrackedBead[];
  operators: Agent[];
  actions: TaskAction[];
}

function rigFromAddress(value?: string | null): string | null {
  if (!value) return null;
  const [rig] = value.split('/');
  return rig || null;
}

function beadFromBranch(branch?: string): string | undefined {
  if (!branch) return undefined;
  const last = branch.split('/').filter(Boolean).at(-1);
  if (!last) return undefined;
  const candidate = last.includes('@') ? last.slice(0, last.indexOf('@')) : last;
  return /^[a-z]+-[a-z0-9]+$/i.test(candidate) ? candidate : undefined;
}

function parseRepo(repoFullName?: string): { owner: string; repo: string } | null {
  if (!repoFullName) return null;
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) return null;
  return { owner, repo };
}

function matchesBead(pr: PullRequest, beadId: string): boolean {
  const needle = beadId.toLowerCase();
  return (
    beadFromBranch(pr.headRefName) === beadId ||
    pr.title.toLowerCase().includes(needle) ||
    (pr.headRefName ?? '').toLowerCase().includes(needle)
  );
}

function mapRelatedPullRequest(pr: PullRequest): RelatedPullRequest | null {
  if (!pr.repo) return null;
  const parsed = parseRepo(pr.repo);
  if (!parsed) return null;
  return {
    ...parsed,
    repoFullName: pr.repo,
    number: pr.number,
    title: pr.title,
    rig: pr.rig,
    state: pr.state,
    reviewDecision: pr.reviewDecision,
    updatedAt: pr.updatedAt,
    headRefName: pr.headRefName,
    isDraft: pr.isDraft,
  };
}

function prTone(pr: RelatedPullRequest): Tone {
  if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'danger';
  if (pr.reviewDecision === 'APPROVED') return 'ok';
  if (pr.isDraft) return 'neutral';
  return 'accent';
}

export function relatedPullRequests(beadId: string, prs: PullRequest[]): RelatedPullRequest[] {
  return prs
    .filter((pr) => matchesBead(pr, beadId))
    .map(mapRelatedPullRequest)
    .filter((value): value is RelatedPullRequest => value != null)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export function buildIssueHub(
  bead: BeadDetail,
  convoys: Convoy[],
  agents: Agent[],
  prs: PullRequest[],
): IssueHubState {
  const convoy = convoys.find((item) => (item.tracked ?? []).some((tracked) => tracked.id === bead.id)) ?? null;
  const agent =
    agents.find((item) => item.address === bead.assignee) ??
    agents.find((item) => item.hook_bead === bead.id) ??
    null;
  const rig = rigFromAddress(agent?.address ?? bead.assignee);
  const relatedPrs = relatedPullRequests(bead.id, prs);
  const actions: TaskAction[] = [];

  if (convoy && convoySignal(convoy).state === 'blocked') {
    actions.push({
      id: 'inspect-convoy',
      tone: 'warn',
      title: 'Unblock the convoy',
      detail: `${convoy.completed}/${convoy.total} done; this task is part of stalled convoy work.`,
      cta: 'Open convoy',
      target: { kind: 'convoy', convoyId: convoy.id },
    });
  }

  if (bead.status === 'blocked' && bead.dependencies?.[0]) {
    actions.push({
      id: 'inspect-dependency',
      tone: 'warn',
      title: `Check ${bead.dependencies[0].id}`,
      detail: 'A dependency is likely blocking this bead from moving forward.',
      cta: 'Open dependency',
      target: { kind: 'issue', issueId: bead.dependencies[0].id },
    });
  }

  if (!agent && bead.status === 'open') {
    actions.push({
      id: 'dispatch-work',
      tone: 'accent',
      title: 'Dispatch the next owner',
      detail: 'No assignee is currently attached, so the task still needs an operator or polecat.',
      cta: 'Go to work board',
      target: { kind: 'work' },
    });
  }

  if (rig) {
    actions.push({
      id: 'inspect-rig',
      tone: agent?.running === false ? 'danger' : 'info',
      title: 'Inspect runtime context',
      detail: agent
        ? `${agent.name} is ${agent.state}${agent.hook_bead ? ` on ${agent.hook_bead}` : ''}.`
        : `${bead.assignee} is assigned, but live runtime details are not loaded on this bead.`,
      cta: 'Open rig',
      target: { kind: 'rig', rig },
    });
  }

  if (relatedPrs[0]) {
    const pr = relatedPrs[0];
    actions.push({
      id: 'review-pr',
      tone: prTone(pr),
      title: `Review PR #${pr.number}`,
      detail: `${pr.repoFullName} has active code review context linked to this bead.`,
      cta: 'Open PR',
      target: { kind: 'pr', owner: pr.owner, repo: pr.repo, prNumber: pr.number },
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'scan-work',
      tone: 'ok',
      title: 'Hold context here',
      detail: 'This task has no active blockers or linked review pressure right now.',
      cta: convoy ? 'Open convoy' : 'Open work board',
      target: convoy ? { kind: 'convoy', convoyId: convoy.id } : { kind: 'work' },
    });
  }

  return {
    convoy,
    agent,
    rig,
    relatedPrs,
    actions: actions.slice(0, 4),
  };
}

export function buildConvoyHub(convoy: Convoy, agents: Agent[]): ConvoyHubState {
  const tracked = convoy.tracked ?? [];
  const blocked = tracked.filter((bead) => trackedBeadState(bead) === 'blocked');
  const active = tracked.filter((bead) => trackedBeadState(bead) === 'active');
  const queued = tracked.filter((bead) => trackedBeadState(bead) === 'open');
  const beadIds = new Set(tracked.map((bead) => bead.id));
  const assignees = new Set(tracked.map((bead) => bead.assignee).filter((value): value is string => Boolean(value)));
  const operators = agents.filter(
    (agent) => assignees.has(agent.address) || (agent.hook_bead != null && beadIds.has(agent.hook_bead)),
  );
  const actions: TaskAction[] = [];

  if (blocked[0]) {
    actions.push({
      id: 'inspect-blocked-bead',
      tone: 'warn',
      title: `Unblock ${blocked[0].id}`,
      detail: 'A blocked bead is currently holding this convoy in place.',
      cta: 'Open bead',
      target: { kind: 'issue', issueId: blocked[0].id },
    });
  }

  const queuedWithoutAssignee = queued.find((bead) => !bead.assignee);
  if (queuedWithoutAssignee) {
    actions.push({
      id: 'dispatch-queued-bead',
      tone: 'accent',
      title: `Dispatch ${queuedWithoutAssignee.id}`,
      detail: 'Queued work is present but still unassigned.',
      cta: 'Go to work board',
      target: { kind: 'work' },
    });
  }

  if (operators[0]) {
    const rig = rigFromAddress(operators[0].address);
    if (rig) {
      actions.push({
        id: 'inspect-operator-rig',
        tone: operators[0].running ? 'info' : 'danger',
        title: 'Inspect operator runtime',
        detail: `${operators[0].name} is ${operators[0].state}${operators[0].hook_bead ? ` on ${operators[0].hook_bead}` : ''}.`,
        cta: 'Open rig',
        target: { kind: 'rig', rig },
      });
    }
  }

  if (actions.length === 0) {
    actions.push({
      id: 'return-to-board',
      tone: 'ok',
      title: 'Stay on the convoy',
      detail: 'Tracked work is moving and no immediate escalation is visible.',
      cta: 'Open work board',
      target: { kind: 'work' },
    });
  }

  return {
    blocked,
    active,
    queued,
    operators,
    actions: actions.slice(0, 4),
  };
}
