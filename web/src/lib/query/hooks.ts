import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from './keys';
import type {
  ActivityResponse,
  Bead,
  Formula,
  MailMessage,
  PullRequest,
  SetupStatus,
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
  });
}

/** Open pull requests aggregated across rigs. External `gh` calls — poll slowly. */
export function usePullRequests(state: string) {
  return useQuery({
    queryKey: queryKeys.pullRequests(state),
    queryFn: () => apiClient.get<PullRequest[]>(`/api/github/prs?state=${encodeURIComponent(state)}`),
    refetchInterval: 60_000,
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
