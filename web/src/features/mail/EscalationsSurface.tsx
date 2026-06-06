import { Surface } from '@/components/Surface';
import { Spinner } from '@/components/primitives';
import { useEscalations, useAckEscalation, useCloseEscalation } from '@/lib/query/hooks';
import { EscalationsPanel } from './EscalationsPanel';

/**
 * Escalations surface — structured triage view driven by /api/escalations
 * (gt escalate list --json) instead of sniffing mail subjects.
 * Supports inline ack and close actions.
 */
export function EscalationsSurface() {
  const { data, isLoading, isError, error, refetch } = useEscalations();
  const ackMutation = useAckEscalation();
  const closeMutation = useCloseEscalation();

  if (isLoading) {
    return (
      <Surface title="Escalations">
        <div className="flex items-center gap-3 px-4 py-20 text-sm text-muted">
          <Spinner />
          Loading escalations…
        </div>
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface title="Escalations">
        <div className="flex flex-col gap-4 px-4 py-16 text-center">
          <p className="text-sm text-fg">Could not load escalations.</p>
          <p className="font-mono text-xs text-faint">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <button
            type="button"
            className="mx-auto rounded border border-line px-3 py-1.5 text-sm text-muted hover:text-fg"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      </Surface>
    );
  }

  return (
    <Surface
      title="Escalations"
      description="Pending escalations from gt escalate list, ranked by severity."
    >
      <EscalationsPanel
        escalations={data}
        onAck={(id) => void ackMutation.mutate(id)}
        onClose={(id) => void closeMutation.mutate({ id })}
      />
    </Surface>
  );
}
