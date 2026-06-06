import { Panel, Spinner, Button } from '@/components/primitives';

/** Shared loading panel for the mail surfaces. */
export function MailLoading({ label }: { label: string }) {
  return (
    <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
      <Spinner />
      {label}
    </Panel>
  );
}

/** Shared "bridge unreachable" panel with a retry. */
export function MailError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Panel className="flex flex-col items-center gap-4 py-16 text-center">
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
