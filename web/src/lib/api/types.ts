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
  rig?: string | null;
}

export interface AgentRuntimeOutput {
  session: string;
  output: string | null;
  running: boolean;
}

export interface OperatorCommandResult {
  success: boolean;
  message?: string;
  error?: string;
  raw?: string;
  target?: string;
  service?: string;
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

/**
 * A structured town event from the activity feed (`.events.jsonl` via
 * `/api/activity`). The `payload` shape varies by `type`; the Activity surface
 * adapts it for display rather than over-typing every variant here.
 */
export type ActivityEventType =
  | 'session_start'
  | 'session_death'
  | 'mail'
  | 'nudge'
  | 'done'
  | 'sling'
  | 'spawn'
  | 'handoff'
  | 'escalation_sent'
  | 'escalation_acked'
  | 'escalation_closed'
  | string;

export interface ActivityEvent {
  id: string;
  ts: string | null;
  type: ActivityEventType;
  actor: string | null;
  source: string | null;
  payload: Record<string, unknown>;
}

export interface ActivityResponse {
  items: ActivityEvent[];
  total: number;
}

export interface MailMessage {
  id: string;
  from: string;
  to?: string;
  subject: string;
  /** Body. The CLI is inconsistent: prefer `message`, fall back to `body`. */
  message?: string;
  body?: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | string;
}

/** A bead tracked by a convoy (`gt convoy list/status --json`). */
export interface TrackedBead {
  id: string;
  title: string;
  status: AgentState | 'open' | 'hooked' | 'in_progress' | 'blocked' | 'closed' | string;
  dependency_type?: string;
  issue_type?: string;
  blocked?: boolean;
  assignee?: string | null;
}

/** A convoy: a tracked unit of dispatched work. */
export interface Convoy {
  id: string;
  title: string;
  status: 'open' | 'closed' | string;
  created_at?: string;
  /** Present on the detail endpoint. */
  lifecycle?: string;
  owned?: boolean;
  tracked: TrackedBead[] | null;
  completed: number;
  total: number;
}

/** A dispatch target (`gt` agent/rig the operator can sling work to). */
export interface Target {
  id: string;
  name: string;
  type: 'global' | 'rig' | 'agent' | string;
  role?: AgentRole;
  description?: string;
  running?: boolean;
  has_work?: boolean;
}

export interface CreateWorkDispatchResult {
  ok: boolean;
  target?: string | null;
  error?: string | null;
}

export interface CreateWorkBead {
  id: string;
  title: string;
  description?: string;
  priority?: number;
  status?: string;
  issue_type?: string;
  workflow_state: 'created' | 'slung' | 'dispatch_failed' | string;
  dispatch?: CreateWorkDispatchResult | null;
}

export interface CreateWorkConvoy {
  id: string;
  title: string;
  notify?: string;
  total?: number;
  completed?: number;
}

export interface CreateWorkResult {
  mode: 'single' | 'convoy';
  outcome: 'created' | 'slung' | 'partial' | string;
  bead: CreateWorkBead | null;
  beads: CreateWorkBead[];
  convoy: CreateWorkConvoy | null;
}

/**
 * A beads issue, as returned by `bd list --json` / `/api/beads`. Numeric
 * `priority` is the beads convention (0 = P0/urgent … 4 = P4/backlog).
 */
export interface Bead {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: number;
  issue_type?: string;
  owner?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  dependency_count?: number;
  dependent_count?: number;
  comment_count?: number;
}

export interface BeadDependency {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: number;
  issue_type?: string;
  created_at?: string;
  updated_at?: string;
  ephemeral?: boolean;
  dependency_type?: string;
}

export interface BeadDetail extends Bead {
  assignee?: string | null;
  dependencies?: BeadDependency[];
}

export type MayorRequestStage = 'dispatched' | 'dispatch_failed' | 'create_failed';

export interface MayorRequestItem {
  beadId?: string;
  title: string;
  target?: string | null;
  stage: MayorRequestStage;
  error?: string;
}

export interface MayorRequestResponse {
  success: boolean;
  status: 'ok' | 'partial' | 'failed';
  prompt: string;
  target?: string | null;
  molecule?: string | null;
  args?: string | null;
  summary: {
    created: number;
    dispatched: number;
    failed: number;
  };
  items: MayorRequestItem[];
}

/** GitHub author object (`author.login`). */
export interface GitHubUser {
  login?: string;
  name?: string;
  is_bot?: boolean;
}

/**
 * A pull request, aggregated across rigs by `/api/github/prs` (each row is
 * tagged with its `repo` and originating `rig`).
 */
export interface PullRequest {
  number: number;
  title: string;
  author?: GitHubUser;
  createdAt?: string;
  updatedAt?: string;
  url?: string;
  headRefName?: string;
  state?: string;
  isDraft?: boolean;
  /** '', 'APPROVED', 'CHANGES_REQUESTED', 'REVIEW_REQUIRED'. */
  reviewDecision?: string;
  repo?: string;
  rig?: string;
}

/** Full PR detail from `/api/prs/:owner/:repo/:number` (token-based). */
export interface PullRequestFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface PullRequestReview {
  id: number;
  user?: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | string;
  body?: string;
  submittedAt?: string;
}

export interface PullRequestComment {
  id: number;
  user?: string;
  body: string;
  createdAt: string;
}

export interface CheckRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | null;
  url?: string;
  app?: string;
}

export interface PullRequestLabel {
  name: string;
  color: string;
}

export interface PullRequestDetail {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | string;
  draft: boolean;
  merged: boolean;
  mergedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  url?: string;
  author?: { login: string; avatar?: string } | null;
  headRefName?: string;
  baseRefName?: string;
  headSha?: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  labels?: PullRequestLabel[];
  reviewDecision?: string | null;
  files: PullRequestFile[];
  reviews: PullRequestReview[];
  comments: PullRequestComment[];
  checks: CheckRun[];
}

/** A formula (workflow / convoy template) from `/api/formulas`. */
export interface Formula {
  name: string;
  type?: string;
  description?: string;
  source?: string;
  steps?: number;
  vars?: number;
  template?: string;
}

export interface FormulaStep {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface FormulaDetail extends Omit<Formula, 'steps' | 'vars'> {
  schema_version?: number;
  variables?: unknown[];
  vars?: number | unknown[];
  steps?: FormulaStep[];
  template?: string;
}

/** A node in the bead dependency graph (`/api/beads/graph`). */
export interface BeadGraphNode {
  id: string;
  title: string;
  status: string;
  priority?: number;
  issue_type?: string;
  rig: string;
}

/** An edge in the bead dependency graph. Type: `blocks`, `parent-child`, `discovered-from`. */
export interface BeadGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface BeadGraphData {
  nodes: BeadGraphNode[];
  edges: BeadGraphEdge[];
}

/** Scheduler capacity from `gt scheduler status --json` via `/api/scheduler/status`. */
export interface SchedulerCapacity {
  max: number;
  working: number;
  recovery_blocked: number;
  reusable_idle: number;
  pending_mr: number;
  reservations: number;
  free: number;
  active_sessions: number;
}

export interface SchedulerStatus {
  paused: boolean;
  queued_total: number;
  queued_ready: number;
  active_polecats: number;
  capacity: SchedulerCapacity;
  /** Scheduled beads waiting for capacity (null when queue is empty). */
  beads: Bead[] | null;
}

/** A single dog from `gt dog list --json` via `/api/dogs`. */
export interface Dog {
  name: string;
  state: 'idle' | 'working' | 'recycled' | string;
  last_active?: string;
  worktrees?: Record<string, string>;
}

/** Summary from `gt dog status --json`. */
export interface DogSummary {
  total: number;
  idle: number;
  working: number;
  kennel_dir: string;
}

export interface DogsResponse {
  dogs: Dog[];
  summary: DogSummary | null;
}

/** An open escalation from `gt escalate list --json` via `/api/escalations`. */
export interface Escalation {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'closed' | string;
  priority?: number;
  issue_type?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  labels?: string[];
  ephemeral?: boolean;
}

/** A merge request from `gt mq list <rig> --json` via `/api/mq/:rig`. */
export interface MergeRequest {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'closed' | string;
  priority?: number;
  issue_type?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  labels?: string[];
  ephemeral?: boolean;
}

/** Refinery status from `gt refinery status <rig> --json` via `/api/refinery/:rig/status`. */
export interface RefineryStatus {
  running: boolean;
  rig_name: string;
  session: string;
  queue_length: number;
}

/** Witness status from `gt witness status <rig> --json` via `/api/witness/:rig/status`. */
export interface WitnessStatus {
  running: boolean;
  rig_name: string;
  session: string;
  monitored_polecats?: string[];
}

/** Dolt database stats from `gt health --json` via `/api/dolt/health`. */
export interface DoltDatabase {
  name: string;
  issues: number;
  open_issues: number;
  wisps: number;
  open_wisps: number;
  commits: number;
}

export interface DoltServerHealth {
  running: boolean;
  pid?: number;
  port?: number;
  connections?: number;
  max_connections?: number;
  disk_usage_bytes?: number;
  disk_usage_human?: string;
  last_commit_age_seconds?: number;
  last_commit_db?: string;
}

export interface DoltHealth {
  timestamp: string;
  server: DoltServerHealth;
  databases: DoltDatabase[];
  backups?: { dolt_stale: boolean; jsonl_stale: boolean };
  processes?: { zombie_count: number };
}

/** A changelog entry from `gt changelog --json` via `/api/changelog`. */
export interface ChangelogEntry {
  id: string;
  title: string;
  type?: string;
  rig?: string;
  closed_at?: string;
  close_reason?: string;
}

/** Rig summary from `gt rig list --json` via `/api/rig-list`. */
export interface RigSummary {
  name: string;
  beads_prefix?: string;
  status?: string;
  witness?: string;
  refinery?: string;
  polecats?: number;
  crew?: number;
}

/** A trail bead item from `gt trail beads --json` via `/api/trail?type=beads`. */
export interface TrailBeadItem {
  id: string;
  title: string;
  status?: string;
  priority?: number;
  assignee?: string;
  updated_at?: string;
  labels?: string[];
}

/** A trail hook item from `gt trail hooks --json` via `/api/trail?type=hooks`. */
export interface TrailHookItem {
  type: string;
  actor: string;
  bead?: string;
  timestamp: string;
  time_relative?: string;
}

/** Ready-work response from `gt ready --json` via `/api/ready`. */
export interface ReadySource {
  name: string;
  issues: ReadyIssue[];
}

export interface ReadyIssue {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  issue_type?: string;
  created_at?: string;
  updated_at?: string;
  assignee?: string;
  labels?: string[];
}

export interface ReadyResponse {
  sources: ReadySource[];
  summary?: Record<string, unknown>;
  town_root?: string;
}
