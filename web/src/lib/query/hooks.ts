import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from './keys';
import type {
  ActivityResponse,
  Bead,
  Convoy,
  Formula,
  MailMessage,
  PullRequest,
  SetupStatus,
  Target,
  TownStatus,
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

/** Open pull requests aggregated across rigs. External `gh` calls — poll slowly. */
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
