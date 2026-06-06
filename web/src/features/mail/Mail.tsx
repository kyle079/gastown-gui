import { useMemo } from 'react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/primitives';
import { useMail } from '@/lib/query/hooks';
import { useCompose } from './ComposeProvider';
import { useMailController } from './useMailController';
import { escalationsOf } from './mailSignal';
import { EscalationsPanel } from './EscalationsPanel';
import { Inbox } from './Inbox';
import { MailDetailDialog } from './MailDetailDialog';
import { MailLoading, MailError } from './MailFallback';

/**
 * Mail — one surface, one job: triage the inbox. Escalations lead (signal over
 * noise), the full inbox follows. Compose is one click or `mod+k → Compose`
 * away; reading, acking, and responding all happen in place.
 */
export function Mail() {
  const { data, isLoading, isError, error, refetch } = useMail();
  const { open: openCompose } = useCompose();
  const ctrl = useMailController();

  const mail = useMemo(() => data ?? [], [data]);
  const escalations = useMemo(() => escalationsOf(mail), [mail]);
  const unread = mail.filter((m) => !m.read).length;

  const description =
    mail.length === 0
      ? 'Agent mail and escalations.'
      : `${unread} unread · ${escalations.length} escalation${escalations.length === 1 ? '' : 's'}`;

  return (
    <Surface
      title="Mail"
      description={description}
      actions={
        <Button variant="primary" size="sm" onClick={() => openCompose()}>
          Compose
        </Button>
      }
    >
      {isLoading ? (
        <MailLoading label="Loading mail…" />
      ) : isError || !data ? (
        <MailError error={error} onRetry={() => void refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          {escalations.length > 0 && (
            <EscalationsPanel
              escalations={escalations}
              onSelect={ctrl.select}
              onAck={ctrl.ack}
              busyId={ctrl.busyId}
            />
          )}
          <Inbox mail={mail} onSelect={ctrl.select} />
        </div>
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
