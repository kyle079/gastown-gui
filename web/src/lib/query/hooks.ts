import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from './keys';
import type {
  ActivityResponse,
  Convoy,
  MailMessage,
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
