import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface TerminalSession {
  name: string;
  role: string;
  rig: string;
  label: string;
  cwd: string | null;
  cwdExists: boolean;
  attached: boolean;
  stale: boolean;
  staleReason: string | null;
  cleanupSafe: boolean;
}

export interface TerminalSessionGroup {
  role: string;
  sessions: TerminalSession[];
}

export interface TerminalSessionsResponse {
  sessions: TerminalSession[];
  groups: TerminalSessionGroup[];
  socket: string | null;
  warning?: string;
}

export function useTerminalSessions() {
  return useQuery({
    queryKey: ['terminal-sessions'],
    queryFn: () => apiClient.get<TerminalSessionsResponse>('/api/terminal/sessions'),
    refetchInterval: 5_000,
  });
}
