/**
 * Static orientation content for the Help surface — the "what is this" glossary
 * and the core workflow. Kept as plain data so the views stay presentational and
 * the vocabulary lives in one editable place.
 */

export interface Concept {
  term: string;
  /** Optional grouping label (structure / agents / work / comms). */
  group: ConceptGroup;
  definition: string;
}

export type ConceptGroup = 'Structure' | 'Agents' | 'Work' | 'Signals';

export const CONCEPTS: Concept[] = [
  {
    term: 'Town',
    group: 'Structure',
    definition: 'The workspace. Everything — rigs, agents, the work and mail queues — lives inside one town.',
  },
  {
    term: 'Rig',
    group: 'Structure',
    definition: 'A project: one git repository connected to the town. Agents do their work within a rig.',
  },
  {
    term: 'Mayor',
    group: 'Agents',
    definition: 'The global coordinator. Breaks down requests and dispatches work across every rig.',
  },
  {
    term: 'Witness',
    group: 'Agents',
    definition: 'A rig’s monitor. Watches agent health and verifies completed work before it lands.',
  },
  {
    term: 'Refinery',
    group: 'Agents',
    definition: 'A rig’s merge queue. Batches finished branches and lands them to the main branch.',
  },
  {
    term: 'Polecat',
    group: 'Agents',
    definition: 'An ephemeral worker spawned for a single issue. It does the work, submits it, then self-cleans.',
  },
  {
    term: 'Crew',
    group: 'Agents',
    definition: 'A longer-lived worker that persists across tasks, where a polecat is one-and-done.',
  },
  {
    term: 'Bead',
    group: 'Work',
    definition: 'A git-tracked issue — the unit of work. Has an id, a title, a status, and an assignee.',
  },
  {
    term: 'Hook',
    group: 'Work',
    definition: 'The slot an agent’s assigned work hangs on. Work “on the hook” triggers the agent to run it.',
  },
  {
    term: 'Sling',
    group: 'Work',
    definition: 'Assign a bead to a rig or agent. The work lands on their hook and they pick it up.',
  },
  {
    term: 'Convoy',
    group: 'Work',
    definition: 'A batch grouping related beads, so progress on a feature is tracked as one thing.',
  },
  {
    term: 'Mail',
    group: 'Signals',
    definition: 'How agents — and you — communicate: status, questions, handoffs. Persistent and addressable.',
  },
  {
    term: 'Escalation',
    group: 'Signals',
    definition: 'An agent asking for a decision it can’t make. Ranked by severity; it waits on your authorization.',
  },
];

export const CONCEPT_GROUPS: ConceptGroup[] = ['Structure', 'Agents', 'Work', 'Signals'];

export interface WorkflowStep {
  title: string;
  detail: string;
}

/** The core loop, stated plainly — no celebration, no fanfare. */
export const WORKFLOW: WorkflowStep[] = [
  {
    title: 'File a bead',
    detail: 'Capture the work as an issue — bd create "title". It becomes a git-tracked unit of work.',
  },
  {
    title: 'Sling it to a rig',
    detail: 'Assign the bead; it lands on an agent’s hook in the target project.',
  },
  {
    title: 'The agent runs',
    detail: 'A polecat picks the work off its hook and works autonomously through to submission.',
  },
  {
    title: 'It lands',
    detail: 'The witness verifies and the refinery merges the branch to main. Watch it from the Dashboard.',
  },
];
