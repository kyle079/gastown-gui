import { useMemo } from 'react';
import { Surface } from '@/components/Surface';
import { useMail } from '@/lib/query/hooks';
import { useMailController } from './useMailController';
import { escalationsOf } from './mailSignal';
import { EscalationsPanel } from './EscalationsPanel';
import { MailDetailDialog } from './MailDetailDialog';
import { MailLoading, MailError } from './MailFallback';

/**
 * Escalations — the focused triage surface. Strips everything but the messages
 * the operator must authorize or clear, severity-ranked. Same components and
 * actions as Mail, nothing else competing for attention: do less, well.
 */
export function Escalations() {
  const { data, isLoading, isError, error, refetch } = useMail();
  const ctrl = useMailController();

  const escalations = useMemo(() => escalationsOf(data ?? []), [data]);
  const unread = escalations.filter((m) => !m.read).length;

  const description =
    escalations.length === 0
      ? 'Nothing pending authorization.'
      : `${unread} unacknowledged of ${escalations.length}`;

  return (
    <Surface title="Escalations" description={description}>
      {isLoading ? (
        <MailLoading label="Loading escalations…" />
      ) : isError || !data ? (
        <MailError error={error} onRetry={() => void refetch()} />
      ) : (
        <EscalationsPanel
          escalations={escalations}
          onSelect={ctrl.select}
          onAck={ctrl.ack}
          busyId={ctrl.busyId}
        />
      )}

      <MailDetailDialog
        mail={ctrl.selected}
        onClose={ctrl.clearSelected}
        onToggleRead={ctrl.toggleRead}
        onRespond={ctrl.respond}
        busy={ctrl.busyId === ctrl.selected?.id}
      />
    </Surface>
  );
}
