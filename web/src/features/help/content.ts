/**
 * Static orientation content for the Help surface.
 * Kept as plain data so the views stay presentational and the vocabulary lives
 * in one editable place.
 *
 * Ordering principle: plain language first, Gas Town term as secondary label.
 * Terms appear after the action they support, not before.
 */

export interface Concept {
  term: string;
  /** Plain-language description of what the operator does with this thing. */
  definition: string;
  /** Optional grouping label. */
  group: ConceptGroup;
  /** Optional secondary Gas Town label shown smaller after the term. */
  gasLabel?: string;
}

export type ConceptGroup = 'Projects and structure' | 'The agents' | 'Tracking work' | 'Signals';

/** Concepts ordered so each is introduced after the action it supports. */
export const CONCEPTS: Concept[] = [
  // Projects and structure — understand the workspace before anything else
  {
    term: 'The workspace',
    gasLabel: 'town',
    group: 'Projects and structure',
    definition: 'Everything lives here — projects, agents, work, and messages. One workspace, one overview.',
  },
  {
    term: 'A connected project',
    gasLabel: 'rig',
    group: 'Projects and structure',
    definition: 'One git repository linked to the workspace. Agents do their work inside a rig.',
  },

  // The agents — who does what
  {
    term: 'Global coordinator',
    gasLabel: 'mayor',
    group: 'The agents',
    definition: 'Ask it to break down a goal and dispatch the work across every project automatically.',
  },
  {
    term: 'Project monitor',
    gasLabel: 'witness',
    group: 'The agents',
    definition: 'Watches each rig — checks agent health and verifies finished work before it merges.',
  },
  {
    term: 'Merge queue',
    gasLabel: 'refinery',
    group: 'The agents',
    definition: 'Batches finished branches and lands them to main safely, running tests on the combined stack.',
  },
  {
    term: 'Task worker',
    gasLabel: 'polecat',
    group: 'The agents',
    definition: 'An ephemeral agent spawned for one issue. It does the work, submits it, then self-cleans.',
  },
  {
    term: 'Persistent worker',
    gasLabel: 'crew',
    group: 'The agents',
    definition: 'A longer-lived agent that handles ongoing work — unlike a polecat, it stays across tasks.',
  },

  // Tracking work — what gets done
  {
    term: 'A task (tracked issue)',
    gasLabel: 'bead',
    group: 'Tracking work',
    definition: 'The unit of work. Has an ID, title, status, and assignee. Stored in git alongside the code.',
  },
  {
    term: 'Assigned work',
    gasLabel: 'hook',
    group: 'Tracking work',
    definition: 'The slot an agent\'s current task hangs on. Work "on the hook" means the agent is working it.',
  },
  {
    term: 'Send work to an agent',
    gasLabel: 'sling',
    group: 'Tracking work',
    definition: 'Assign a task to a rig or agent. It lands on their hook and they pick it up automatically.',
  },
  {
    term: 'A feature batch',
    gasLabel: 'convoy',
    group: 'Tracking work',
    definition: 'A named group of related tasks so you can track a whole feature as one thing.',
  },
  {
    term: 'A workflow template',
    gasLabel: 'formula',
    group: 'Tracking work',
    definition: 'A reusable checklist that drives how agents approach a class of work (e.g. "implement a feature").',
  },

  // Signals — how things communicate
  {
    term: 'Messages between agents',
    gasLabel: 'mail',
    group: 'Signals',
    definition: 'How agents — and you — communicate: status, questions, handoffs. Persistent and addressable.',
  },
  {
    term: 'A decision request',
    gasLabel: 'escalation',
    group: 'Signals',
    definition: 'An agent asking for a call it can\'t make alone. Ranked by severity; waits on your response.',
  },
];

export const CONCEPT_GROUPS: ConceptGroup[] = [
  'Projects and structure',
  'The agents',
  'Tracking work',
  'Signals',
];

export interface WorkflowStep {
  title: string;
  detail: string;
  surface?: string;
}

/** The first operator workflow — plain language, surface-first. */
export const FIRST_WORKFLOW: WorkflowStep[] = [
  {
    title: 'Start at Overview',
    detail: 'Open Overview to see what needs you first — top attention signals, active agents, rig health.',
    surface: 'Overview',
  },
  {
    title: 'Clear your queue',
    detail: 'Open Needs Attention to reply to messages, acknowledge escalations, and unblock stalled work.',
    surface: 'Needs Attention',
  },
  {
    title: 'Start new work',
    detail: 'Open Dispatch, describe what you want built, pick a rig target, and send it. The mayor routes it.',
    surface: 'Dispatch',
  },
  {
    title: 'Supervise the agents',
    detail: 'Open Fleet to see which rigs and agents are active. Drill into a rig to inspect sessions and hooks.',
    surface: 'Fleet',
  },
  {
    title: 'Land finished work',
    detail: 'Open Landing to review PRs and watch the merge queue. Clear blockers so finished work gets in.',
    surface: 'Landing',
  },
];

/** The shorter core loop for the sidebar panel. */
export const WORKFLOW: WorkflowStep[] = FIRST_WORKFLOW;
