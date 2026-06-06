import { Dialog, Button, Badge, useToast } from '@/components/primitives';
import type { MailMessage } from '@/lib/api/types';
import { useSetMailRead } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';
import { isEscalation, mailBody, mailSignal, severityOf, severityTone } from './mailSignal';

export interface MailDetailDialogProps {
  mail: MailMessage | null;
  onClose: () => void;
  /** Open the compose dialog prefilled to reply to this message. */
  onRespond: (mail: MailMessage) => void;
}

/**
 * Read one message and act on it — the unified action surface for the inbox and
 * the escalation triage. Shows who/what/when, severity for escalations, the full
 * body, and the two actions that matter: ack (mark read) and respond.
 */
export function MailDetailDialog({ mail, onClose, onRespond }: MailDetailDialogProps) {
  const { notify } = useToast();
  const setRead = useSetMailRead();

  if (!mail) return null;

  const signal = mailSignal(mail);
  const escalation = isEscalation(mail);
  const severity = severityOf(mail);

  const toggleRead = () => {
    const next = !mail.read;
    setRead.mutate(
      { id: mail.id, read: next },
      {
        onSuccess: () => notify(next ? 'Marked read' : 'Marked unread', 'ok'),
        onError: (err) => notify(err instanceof Error ? err.message : 'Action failed', 'danger'),
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      // Escalations get the roomier reading width; ordinary mail stays compact.
      className={escalation ? 'sm:max-w-lg' : undefined}
      title={
        <span className="flex items-center gap-2">
          {escalation ? (
            <Badge tone={severityTone(severity)}>{severity}</Badge>
          ) : (
            <Badge tone={signal.tone}>{signal.label}</Badge>
          )}
          <span className="min-w-0 truncate">{mail.subject || '(no subject)'}</span>
        </span>
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={toggleRead} disabled={setRead.isPending}>
            {mail.read ? 'Mark unread' : 'Mark read'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => onRespond(mail)}>
            Respond
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <dt className="text-faint">From</dt>
          <dd className="truncate font-mono text-fg">{mail.from || '—'}</dd>
          {mail.to != null && (
            <>
              <dt className="text-faint">To</dt>
              <dd className="truncate font-mono text-fg">{mail.to}</dd>
            </>
          )}
          <dt className="text-faint">When</dt>
          <dd className="font-mono text-fg">{relativeTime(mail.timestamp)} ago</dd>
        </dl>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
          {mailBody(mail) || <span className="text-faint">(no content)</span>}
        </p>
      </div>
    </Dialog>
  );
}
