import { useNavigate } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { useMail } from '@/lib/query/hooks';
import type { MailMessage } from '@/lib/api/types';
import { EscalationsPanel } from './EscalationsPanel';
import { MailLoading, MailError } from './MailStates';

/**
 * Escalations surface — focused triage view. Clicking an escalation navigates to
 * /escalations/$messageId for the full routed detail view.
 */
export function EscalationsSurface() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useMail();

  const openMessage = (m: MailMessage) =>
    void navigate({ to: '/escalations/$messageId', params: { messageId: m.id } });

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
    </Surface>
  );
}
