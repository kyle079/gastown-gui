import type { ReactNode } from 'react';
import { Button, Panel, PanelHeader, Spinner } from '@/components/primitives';

/**
 * Shared chrome for a catalog view: a flush panel with a header, a filter row,
 * and a body that resolves loading / error / content. Keeps the three views
 * (issues, PRs, formulas) visually identical without duplicating boilerplate.
 */
export function CatalogPanel({
  title,
  hint,
  filters,
  isLoading,
  isError,
  error,
  onRetry,
  children,
}: {
  title: ReactNode;
  hint?: ReactNode;
  filters?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
  children: ReactNode;
}) {
  return (
    <Panel flush>
      <PanelHeader title={title} hint={hint} />
      {filters != null && (
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          {filters}
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
          <Spinner />
          Loading…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <div>
            <p className="text-sm text-fg">Could not reach the gt bridge.</p>
            <p className="mt-1 font-mono text-xs text-faint">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : (
        children
      )}
    </Panel>
  );
}
