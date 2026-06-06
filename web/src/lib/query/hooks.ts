import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from './keys';
import type {
  MailMessage,
  SendMailInput,
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
 * Acknowledge a message by toggling its read state. Marking an escalation read
 * IS the ack — it clears it from the "needs the operator" surface. Invalidates
 * the inbox so the change is reflected immediately.
 */
export function useMarkMailRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      apiClient.post(`/api/mail/${id}/${read ? 'read' : 'unread'}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mail });
    },
  });
}

/** Compose / respond. Refetches the inbox on success so a reply lands in the feed. */
export function useSendMail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMailInput) => apiClient.post('/api/mail', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mail });
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
