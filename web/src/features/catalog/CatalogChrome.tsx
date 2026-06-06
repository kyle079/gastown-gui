import type { ReactNode } from 'react';
import { Input, Panel, Spinner, Button } from '@/components/primitives';

/**
 * Shared chrome for every Catalog view: a search + filter toolbar, and the
 * loading / error / empty states. Keeps the three views consistent and lets
 * each one focus on its columns.
 */

export interface ToolbarProps {
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
  /** Filter control(s) — a Select, typically. */
  filter?: ReactNode;
  /** Right-aligned count, e.g. "12 of 40". */
  count: ReactNode;
}

export function Toolbar({ query, onQuery, placeholder, filter, count }: ToolbarProps) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="sm:max-w-xs sm:flex-1">
        <Input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </div>
      {filter}
      <span className="font-mono text-2xs tabular-nums text-faint sm:ml-auto">{count}</span>
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <Panel className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <Spinner />
      {label}
    </Panel>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Panel className="flex flex-col items-center gap-4 py-14 text-center">
      <div>
        <p className="text-sm text-fg">Could not reach the gt bridge.</p>
        <p className="mt-1 font-mono text-xs text-faint">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </Panel>
  );
}
