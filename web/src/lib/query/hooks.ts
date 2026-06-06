import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from './keys';
import type {
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

/**
 * Catalog hooks. Each Catalog segment owns its own query and only polls while
 * it is the active segment (`enabled`) — so the surface never fetches three
 * lists when the operator is looking at one. An empty `status` means "all
 * active work" (the bd default, which omits closed).
 */
export function useBeads(status: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.beads(status),
    queryFn: () =>
      apiClient.get<Bead[]>(`/api/beads${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    refetchInterval: 15_000,
    enabled,
  });
}

export function usePullRequests(state: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.prs(state),
    queryFn: () =>
      apiClient.get<PullRequest[]>(`/api/github/prs?state=${encodeURIComponent(state)}`),
    refetchInterval: 30_000,
    enabled,
  });
}

export function useFormulas(enabled = true) {
  return useQuery({
    queryKey: queryKeys.formulas,
    queryFn: () => apiClient.get<Formula[]>('/api/formulas'),
    refetchInterval: 60_000,
    enabled,
  });
}
