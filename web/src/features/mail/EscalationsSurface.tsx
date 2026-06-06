import { Surface } from '@/components/Surface';
import { useMail } from '@/lib/query/hooks';
import { EscalationsPanel } from './EscalationsPanel';
import { useMailDialogs } from './useMailDialogs';
import { MailLoading, MailError } from './MailStates';

/**
 * Escalations surface — the focused triage view. Same escalation lens as the
 * mail surface, alone and given the whole page: ranked by severity, acted on
 * through the shared detail dialog (ack / respond).
 */
export function EscalationsSurface() {
  const { data, isLoading, isError, error, refetch } = useMail();
  const { openMessage, dialogs } = useMailDialogs();

  if (isLoading) {
    return (
      <Surface title="Escalations">
        <MailLoading label="Loading escalations…" />
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface title="Escalations">
        <MailError error={error} onRetry={() => void refetch()} />
      </Surface>
    );
  }

  return (
    <Surface
      title="Escalations"
      description="Pending escalations awaiting authorization, ranked by severity."
    >
      <EscalationsPanel mail={data} onOpen={openMessage} />
      {dialogs}
    </Surface>
  );
}
