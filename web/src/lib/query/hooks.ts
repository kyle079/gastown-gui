import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from './keys';
import type { Convoy, MailMessage, SetupStatus, TownStatus } from '@/lib/api/types';

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
 * The work queue. `all: true` includes finished convoys so the surface can show
 * the full picture (active → queued → done) and the operator can archive-scan.
 * Polls briskly — convoy progress is the surface's whole reason to exist.
 */
export function useConvoys() {
  return useQuery({
    queryKey: queryKeys.convoys,
    queryFn: () => apiClient.get<Convoy[]>('/api/convoys?all=true'),
    refetchInterval: 5_000,
  });
}

export interface CreateConvoyInput {
  name: string;
  /** Bead IDs to track. */
  issues: string[];
}

/** Dispatch a new convoy. Invalidates the queue so the surface reflects it. */
export function useCreateConvoy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConvoyInput) =>
      apiClient.post<{ success: boolean; convoy_id: string | null }>('/api/convoy', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.convoys });
    },
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
