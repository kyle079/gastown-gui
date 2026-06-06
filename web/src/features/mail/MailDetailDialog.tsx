import { Dialog, Button, Badge, StatusPill } from '@/components/primitives';
import { relativeTime } from '@/lib/utils/format';
import type { MailMessage } from '@/lib/api/types';
import { isEscalation, mailBody, mailSignal, severity, severityTone } from './mailSignal';

/**
 * The read view: a single message in full. Header carries who/what/when and the
 * signal; the body is rendered verbatim in mono (agent mail is plaintext, often
 * with paths and commands). Footer holds the three verbs the spec calls for —
 * ack (read/unread toggle), respond, close.
 */
export function MailDetailDialog({
  mail,
  onClose,
  onToggleRead,
  onRespond,
  busy,
}: {
  mail: MailMessage | null;
  onClose: () => void;
  onToggleRead: (mail: MailMessage) => void;
  onRespond: (mail: MailMessage) => void;
  busy?: boolean;
}) {
  if (!mail) return null;

  const sig = mailSignal(mail);
  const body = mailBody(mail);

  return (
    <Dialog
      open
      onClose={onClose}
      className="sm:max-w-xl"
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{mail.subject || '(no subject)'}</span>
          {isEscalation(mail) ? (
            <Badge tone={severityTone(severity(mail))} className="uppercase">
              {severity(mail)}
            </Badge>
          ) : sig.key !== 'note' ? (
            <Badge tone={sig.tone}>{sig.label}</Badge>
          ) : null}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onRespond(mail)}>
            Respond
          </Button>
          <Button
            variant="default"
            disabled={busy}
            onClick={() => onToggleRead(mail)}
          >
            {mail.read ? 'Mark unread' : 'Mark read'}
          </Button>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-fg">{mail.from}</span>
            {mail.to && <span className="font-mono text-faint">to {mail.to}</span>}
          </div>
          <div className="flex items-center gap-2">
            <StatusPill
              tone={mail.read ? 'neutral' : 'accent'}
              label={mail.read ? 'read' : 'unread'}
            />
            <span className="font-mono text-faint">{relativeTime(mail.timestamp)}</span>
          </div>
        </div>
        {body ? (
          <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-fg">
            {body}
          </pre>
        ) : (
          <p className="py-6 text-center text-sm text-faint">No message body.</p>
        )}
      </div>
    </Dialog>
  );
}
