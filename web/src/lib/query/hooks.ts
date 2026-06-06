import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from './keys';
import type { MailMessage, SetupStatus, TownStatus } from '@/lib/api/types';

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
