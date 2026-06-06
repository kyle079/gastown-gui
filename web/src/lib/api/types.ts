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

export type MailPriority = 'low' | 'normal' | 'high';

export interface MailMessage {
  id: string;
  from: string;
  to?: string;
  subject: string;
  /** Primary body field; some endpoints use `body` instead. */
  message?: string;
  body?: string;
  timestamp: string;
  read: boolean;
  priority: MailPriority | string;
}

/** Payload for composing/sending mail (POST /api/mail). */
export interface SendMailInput {
  to: string;
  subject: string;
  message: string;
  priority?: MailPriority;
}
