/**
 * Types for the gt bridge API (server.js).
 *
 * Shapes are derived from the live `gt status --json` contract and the Express
 * endpoints in server.js. They are intentionally permissive where the CLI is
 * loose (nullable arrays, optional fields) so the UI degrades gracefully.
 */

export type AgentState = 'idle' | 'working' | 'stalled' | 'blocked' | string;
export type AgentRole =
  | 'coordinator'
  | 'health-check'
  | 'witness'
  | 'refinery'
  | 'polecat'
  | 'crew'
  | string;

export interface Agent {
  name: string;
  /** Routing address, e.g. "gastown_gui/polecats/rust" or "mayor/". */
  address: string;
  session: string;
  role: AgentRole;
  running: boolean;
  acp: boolean;
  has_work: boolean;
  state: AgentState;
  unread_mail: number;
  agent_alias?: string;
  agent_info?: string;
  /** Present on rig-scoped agents. */
  hook?: string | null;
  hook_bead?: string | null;
}

export interface Rig {
  name: string;
  polecats: Agent[] | null;
  polecat_count: number;
  crews: Agent[] | null;
  crew_count: number;
  has_witness: boolean;
  has_refinery: boolean;
  agents: Agent[];
  git_url?: string | null;
}

export interface StatusSummary {
  rig_count: number;
  polecat_count: number;
  crew_count: number;
  witness_count: number;
  refinery_count: number;
  active_hooks: number;
}

export interface ServiceHealth {
  running: boolean;
  pid?: number;
  port?: number;
  data_dir?: string;
  socket?: string;
  session_count?: number;
}

export interface Overseer {
  name: string;
  email: string;
  username: string;
  source: string;
  unread_mail: number;
}

export interface TownStatus {
  name: string;
  location: string;
  overseer: Overseer;
  daemon: ServiceHealth;
  dolt: ServiceHealth;
  tmux: ServiceHealth;
  agents: Agent[];
  rigs: Rig[];
  summary: StatusSummary;
  runningPolecats?: string[];
}

/**
 * Shape of `GET /api/setup/status` — the first-run readiness probe.
 * Booleans + versions for the CLIs, the workspace, and the configured rigs.
 */
export interface SetupRig {
  name: string;
  [key: string]: unknown;
}

export interface SetupStatus {
  gt_installed: boolean;
  gt_version: string | null;
  bd_installed: boolean;
  bd_version: string | null;
  workspace_initialized: boolean;
  workspace_path: string;
  rigs: SetupRig[];
}

export interface MailMessage {
  id: string;
  from: string;
  to?: string;
  subject: string;
  message?: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | string;
}

/**
 * A bead (issue) as returned by `GET /api/beads` → `bd list --json`.
 * Permissive on optional fields the CLI omits depending on the issue.
 */
export interface Bead {
  id: string;
  title: string;
  description?: string;
  status: string;
  /** Numeric priority: 0 = P0 (urgent) … 4 = P4 (backlog). */
  priority: number;
  issue_type?: string;
  owner?: string;
  assignee?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  dependency_count?: number;
  dependent_count?: number;
  comment_count?: number;
}

/**
 * A GitHub pull request as returned by `GET /api/github/prs` — gh's JSON shape,
 * decorated server-side with the owning `rig` and `repo`.
 */
export interface PullRequest {
  number: number;
  title: string;
  author?: { login: string } | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  headRefName: string;
  state: string;
  isDraft: boolean;
  reviewDecision?: string | null;
  rig?: string;
  repo?: string;
}

/** A formula (workflow template) as returned by `GET /api/formulas`. */
export interface Formula {
  name: string;
  type?: string;
  description?: string;
  source?: string;
  steps?: number;
  vars?: number;
}
