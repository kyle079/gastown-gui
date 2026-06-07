import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from './keys';
import type {
  ActivityResponse,
  Bead,
  BeadDetail,
  BeadGraphData,
  ChangelogEntry,
  Convoy,
  DoltHealth,
  DogsResponse,
  Escalation,
  Formula,
  FormulaDetail,
  MailMessage,
  MergeRequest,
  PullRequest,
  PullRequestDetail,
  ReadyResponse,
  RefineryStatus,
  RigSummary,
  SchedulerStatus,
  SetupStatus,
  Target,
  TownStatus,
  TrailBeadItem,
  TrailHookItem,
  WitnessStatus,
} from '@/lib/api/types';

/**
 * Data hooks. Presentational components consume these — they never touch fetch
 * directly. Polling intervals reflect how fast each surface actually changes.
 */

export function useStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => apiClient.get<TownStatus>('/api/status'),
    refetchInterval: 5_000,
  });
}

export function useMail() {
  return useQuery({
    queryKey: queryKeys.mail,
    queryFn: () => apiClient.get<MailMessage[]>('/api/mail'),
    refetchInterval: 15_000,
  });
}

/**
 * First-run readiness probe (CLIs, workspace, configured rigs). Changes rarely —
 * polls slowly so a fresh install is reflected without hammering the bridge.
 */
export function useSetupStatus() {
  return useQuery({
    queryKey: queryKeys.setup,
    queryFn: () => apiClient.get<SetupStatus>('/api/setup/status'),
    refetchInterval: 30_000,
  });
}

export function useActivity() {
  return useQuery({
    queryKey: queryKeys.activity,
    queryFn: () => apiClient.get<ActivityResponse>('/api/activity?limit=300'),
    // The live WebSocket nudges this to refetch the instant an event lands;
    // the interval is the floor so the feed stays fresh even if the socket drops.
    refetchInterval: 10_000,
  });
}

/**
 * Mark a message read (ack) or unread. Invalidates the inbox so the surface
 * reflects the new state immediately.
 */
export function useSetMailRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      apiClient.post(`/api/mail/${id}/${read ? 'read' : 'unread'}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.mail }),
  });
}

export interface SendMailInput {
  to: string;
  subject: string;
  message: string;
  priority?: string;
}

/** Compose or respond. Backs the compose dialog on the mail surface. */
export function useSendMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMailInput) => apiClient.post('/api/mail', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.mail }),
  });
}

export function useConvoys() {
  return useQuery({
    // Mirrors the server's 10s convoy cache — no point polling faster.
    queryKey: queryKeys.convoys,
    queryFn: () => apiClient.get<Convoy[]>('/api/convoys'),
    refetchInterval: 10_000,
  });
}

/** Dispatch targets change with the fleet — refetch lazily. */
export function useTargets() {
  return useQuery({
    queryKey: queryKeys.targets,
    queryFn: () => apiClient.get<Target[]>('/api/targets'),
    staleTime: 30_000,
  });
}

interface SlingArgs {
  bead: string;
  target?: string;
  molecule?: string;
  quality?: string;
  args?: string;
}

/** Sling a bead onto a target's hook — the primary dispatch action. */
export function useSling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bead, target }: SlingArgs) =>
      apiClient.post<{ success: boolean }>('/api/sling', { bead, target }),
    onSuccess: () => {
      // Dispatch changes both the convoy queue and who's-on-what.
      void qc.invalidateQueries({ queryKey: queryKeys.convoys });
      void qc.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

interface ReassignArgs {
  beadId: string;
  target: string;
}

/** Reassign a tracked bead to a different agent. */
export function useReassign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ beadId, target }: ReassignArgs) =>
      apiClient.post<{ success: boolean }>(`/api/work/${beadId}/reassign`, { target }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.convoys });
      void qc.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

/**
 * Beads issues. `status` filters server-side (`open`, `in_progress`, …);
 * the sentinel `'all'` omits the filter to list everything.
 */
export function useBeads(status: string) {
  return useQuery({
    queryKey: queryKeys.beads(status),
    queryFn: () => {
      const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
      return apiClient.get<Bead[]>(`/api/beads${qs}`);
    },
    refetchInterval: 15_000,
    // Show previous status's data while new status loads (no blank flash on filter change).
    placeholderData: keepPreviousData,
  });
}

/** Full bead detail from `bd show --json`, fetched only when a bead is opened. */
export function useBeadDetail(beadId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.beadDetail(beadId ?? ''),
    queryFn: () => apiClient.get<BeadDetail>(`/api/bead/${encodeURIComponent(beadId ?? '')}`),
    staleTime: 15_000,
    enabled: Boolean(beadId),
  });
}

/** Search beads by id/title/type for dispatch flows. */
export function useBeadSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.beads(`search:${trimmed}`),
    queryFn: () =>
      apiClient.get<Bead[]>(`/api/beads/search?q=${encodeURIComponent(trimmed)}`),
    staleTime: 15_000,
    enabled: trimmed.length > 1,
  });
}

/** Full PR detail from token-based REST API. */
export function usePullRequestDetail(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: queryKeys.pullRequestDetail(owner, repo, number),
    queryFn: () =>
      apiClient.get<PullRequestDetail>(
        `/api/prs/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${number}`,
      ),
    staleTime: 30_000,
    enabled: Boolean(owner && repo && number),
  });
}

/** Open pull requests aggregated across rigs. Polls slowly — GitHub API has rate limits. */
export function usePullRequests(state: string) {
  return useQuery({
    queryKey: queryKeys.pullRequests(state),
    queryFn: () => apiClient.get<PullRequest[]>(`/api/github/prs?state=${encodeURIComponent(state)}`),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** The formula catalog. Rarely changes; the server caches it too. */
export function useFormulas() {
  return useQuery({
    queryKey: queryKeys.formulas,
    queryFn: () => apiClient.get<Formula[]>('/api/formulas'),
    refetchInterval: 60_000,
  });
}

export function useFormulaDetail(name: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.formulas, 'detail', name ?? ''],
    queryFn: () => apiClient.get<FormulaDetail>(`/api/formula/${encodeURIComponent(name ?? '')}`),
    staleTime: 60_000,
    enabled: Boolean(name),
  });
}

/** Bead dependency graph — nodes + typed edges. Changes slowly; poll every 30s. */
export function useBeadGraph() {
  return useQuery({
    queryKey: queryKeys.beadGraph,
    queryFn: () => apiClient.get<BeadGraphData>('/api/beads/graph'),
    refetchInterval: 30_000,
  });
}

/** Scheduler capacity and queue state. Reflects `gt scheduler status --json`. */
export function useSchedulerStatus() {
  return useQuery({
    queryKey: queryKeys.schedulerStatus,
    queryFn: () => apiClient.get<SchedulerStatus>('/api/scheduler/status'),
    refetchInterval: 15_000,
  });
}

/** The Pack — all dogs and their current state. Reflects `gt dog list --json`. */
export function useDogs() {
  return useQuery({
    queryKey: queryKeys.dogs,
    queryFn: () => apiClient.get<DogsResponse>('/api/dogs'),
    refetchInterval: 15_000,
  });
}

/** Open escalations from `gt escalate list --json`. More structured than sniffing mail subjects. */
export function useEscalations() {
  return useQuery({
    queryKey: queryKeys.escalations,
    queryFn: () => apiClient.get<Escalation[]>('/api/escalations'),
    refetchInterval: 10_000,
  });
}

export function useAckEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/escalations/${id}/ack`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.escalations }),
  });
}

export function useCloseEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.post(`/api/escalations/${id}/close`, { reason }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.escalations }),
  });
}

/** Merge queue for a specific rig. Reflects `gt mq list <rig> --json`. */
export function useMergeQueue(rig: string) {
  return useQuery({
    queryKey: queryKeys.mergeQueue(rig),
    queryFn: () => apiClient.get<MergeRequest[]>(`/api/mq/${encodeURIComponent(rig)}`),
    refetchInterval: 10_000,
    enabled: Boolean(rig),
  });
}

/** Refinery running state + queue length for a rig. */
export function useRefineryStatus(rig: string) {
  return useQuery({
    queryKey: queryKeys.refineryStatus(rig),
    queryFn: () => apiClient.get<RefineryStatus>(`/api/refinery/${encodeURIComponent(rig)}/status`),
    refetchInterval: 10_000,
    enabled: Boolean(rig),
  });
}

/** Witness running state + monitored polecats for a rig. */
export function useWitnessStatus(rig: string) {
  return useQuery({
    queryKey: queryKeys.witnessStatus(rig),
    queryFn: () => apiClient.get<WitnessStatus>(`/api/witness/${encodeURIComponent(rig)}/status`),
    refetchInterval: 10_000,
    enabled: Boolean(rig),
  });
}

/** Rich Dolt health: server metrics, per-database stats, backup freshness. */
export function useDoltHealth() {
  return useQuery({
    queryKey: queryKeys.doltHealth,
    queryFn: () => apiClient.get<DoltHealth>('/api/dolt/health'),
    refetchInterval: 30_000,
  });
}

export interface ChangelogOptions {
  since?: string;
  week?: boolean;
  today?: boolean;
  rig?: string;
}

/** Completed work from `gt changelog --json`. */
export function useChangelog(opts: ChangelogOptions = {}) {
  const params = new URLSearchParams();
  if (opts.rig) params.set('rig', opts.rig);
  if (opts.today) params.set('today', 'true');
  else if (opts.week) params.set('week', 'true');
  else if (opts.since) params.set('since', opts.since);
  const qs = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: queryKeys.changelog(opts),
    queryFn: () => apiClient.get<ChangelogEntry[]>(`/api/changelog${qs}`),
    refetchInterval: 60_000,
  });
}

/** Structured rig list from `gt rig list --json`. Lighter than full /api/status. */
export function useRigList() {
  return useQuery({
    queryKey: queryKeys.rigList,
    queryFn: () => apiClient.get<RigSummary[]>('/api/rig-list'),
    refetchInterval: 30_000,
  });
}

export interface TrailOptions {
  type?: 'beads' | 'commits' | 'hooks';
  since?: string;
  limit?: number;
}

/** Recent activity trail from `gt trail --json` via `/api/trail`. */
export function useTrail(opts: TrailOptions = {}) {
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.since) params.set('since', opts.since);
  if (opts.limit != null) params.set('limit', String(opts.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: queryKeys.trail(opts),
    queryFn: () =>
      apiClient.get<TrailBeadItem[] | TrailHookItem[] | null>(`/api/trail${qs}`),
    refetchInterval: 15_000,
  });
}

export interface ReadyOptions {
  rig?: string;
}

/** All ready (unblocked) work from `gt ready --json` via `/api/ready`. */
export function useReady(opts: ReadyOptions = {}) {
  const params = new URLSearchParams();
  if (opts.rig) params.set('rig', opts.rig);
  const qs = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: queryKeys.ready(opts),
    queryFn: () => apiClient.get<ReadyResponse | null>(`/api/ready${qs}`),
    refetchInterval: 20_000,
  });
}
