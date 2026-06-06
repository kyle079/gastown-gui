import { useNavigate, useParams, useRouterState } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { Panel, Spinner, Button, Badge, useToast } from '@/components/primitives';
import { useMail, useSetMailRead } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';
import { isEscalation, mailBody, mailSignal, severityOf, severityTone } from './mailSignal';
import { ComposeDialog, type ComposePrefill } from './ComposeDialog';
import { useState } from 'react';

/**
 * Full-page routed mail message view. Works for both /mail/$messageId and
 * /escalations/$messageId — the surface title and back path adapt to the
 * current location prefix.
 */
export function MailMessagePage() {
  const { messageId } = useParams({ strict: false }) as { messageId: string };
  const navigate = useNavigate();
  const { location } = useRouterState();
  const { data, isLoading } = useMail();
  const { notify } = useToast();
  const setRead = useSetMailRead();
  const [compose, setCompose] = useState<{ open: boolean; prefill?: ComposePrefill }>({ open: false });

  // Infer context from the current path prefix
  const isEscalationsContext = location.pathname.startsWith('/escalations');
  const backPath = isEscalationsContext ? '/escalations' : '/mail';
  const surfaceTitle = isEscalationsContext ? 'Escalations' : 'Mail';

  const back = () => void navigate({ to: backPath });

  if (isLoading) {
    return (
      <Surface
        title={surfaceTitle}
        actions={<Button variant="ghost" size="sm" onClick={back}>← Back</Button>}
      >
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
          <Spinner />
          Loading message…
        </Panel>
      </Surface>
    );
  }

  const mail = data?.find((m) => m.id === messageId);
  if (!mail) {
    return (
      <Surface
        title={surfaceTitle}
        actions={<Button variant="ghost" size="sm" onClick={back}>← Back</Button>}
      >
        <Panel className="py-16 text-center text-sm text-faint">
          Message not found.
        </Panel>
      </Surface>
    );
  }

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

  const openReply = () => {
    const subject = mail.subject?.startsWith('Re:') ? mail.subject : `Re: ${mail.subject ?? ''}`.trim();
    setCompose({ open: true, prefill: { to: mail.from, subject } });
  };

  return (
    <>
      <Surface
        title={
          escalation
            ? `${surfaceTitle} — Escalation`
            : surfaceTitle
        }
        description={mail.subject || '(no subject)'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleRead} disabled={setRead.isPending}>
              {mail.read ? 'Mark unread' : 'Mark read'}
            </Button>
            <Button variant="primary" size="sm" onClick={openReply}>
              Respond
            </Button>
            <Button variant="ghost" size="sm" onClick={back}>← Back</Button>
          </div>
        }
      >
        <Panel>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {escalation ? (
                <Badge tone={severityTone(severity)}>{severity}</Badge>
              ) : (
                <Badge tone={signal.tone}>{signal.label}</Badge>
              )}
              {!mail.read && <Badge tone="accent">Unread</Badge>}
            </div>

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
        </Panel>
      </Surface>

      <ComposeDialog
        open={compose.open}
        onClose={() => setCompose({ open: false })}
        prefill={compose.prefill}
      />
    </>
  );
}
