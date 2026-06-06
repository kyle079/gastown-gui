import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';

/**
 * Shared QueryClient. Tuned for an always-open operator console:
 * fresh-enough data without hammering the CLI bridge.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s staleTime: navigating back shows cached data instantly, with a
      // background refresh only if the data is older than 30s.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // Don't retry client errors (4xx) — they won't fix themselves.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
