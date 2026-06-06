import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from './keys';
import type { ActivityResponse, MailMessage, SetupStatus, TownStatus } from '@/lib/api/types';

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
