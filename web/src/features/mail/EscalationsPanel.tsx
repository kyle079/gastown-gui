import { Panel, PanelHeader, ListRow, StatusDot, Badge, Button } from '@/components/primitives';
import { relativeTime } from '@/lib/utils/format';
import type { MailMessage } from '@/lib/api/types';
import { severity, severityTone } from './mailSignal';

/**
 * The signal-first surface. Escalations are what the operator must authorize or
 * clear, so they lead every mail view: severity-sorted, one row each, with a
 * one-key Ack (mark read) and a click-through to the full message. When the list
 * is empty it says so plainly — silence is the good state, not a blank panel.
 */
export function EscalationsPanel({
  escalations,
  onSelect,
  onAck,
  busyId,
}: {
  escalations: MailMessage[];
  onSelect: (mail: MailMessage) => void;
  onAck: (mail: MailMessage) => void;
  /** Id whose ack is in flight — disables that row's button. */
  busyId?: string | null;
}) {
  const unread = escalations.filter((m) => !m.read).length;

  return (
    <Panel flush>
      <PanelHeader
        title="Escalations"
        hint={unread > 0 ? `${unread} unacknowledged` : `${escalations.length} total`}
      />
      {escalations.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-8 text-sm text-faint">
          <StatusDot tone="ok" />
          No escalations — all clear.
        </div>
      ) : (
        <div className="divide-hairline">
          {escalations.map((mail) => {
            const sev = severity(mail);
            const tone = severityTone(sev);
            return (
              <ListRow
                key={mail.id}
                interactive
                onClick={() => onSelect(mail)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(mail);
                  }
                }}
                leading={<StatusDot tone={tone} pulse={!mail.read && (sev === 'critical' || sev === 'high')} />}
                title={
                  <span className={mail.read ? 'text-muted' : 'font-medium text-fg'}>
                    {mail.subject || '(no subject)'}
                  </span>
                }
                subtitle={
                  <span className="font-mono">
                    {mail.from} · {relativeTime(mail.timestamp)}
                  </span>
                }
                trailing={
                  <>
                    <Badge tone={tone} className="uppercase">
                      {sev}
                    </Badge>
                    {!mail.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === mail.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAck(mail);
                        }}
                      >
                        Ack
                      </Button>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </Panel>
  );
}
