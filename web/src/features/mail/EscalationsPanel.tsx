import { Panel, PanelHeader, ListRow, StatusDot, Badge } from '@/components/primitives';
import type { MailMessage } from '@/lib/api/types';
import { relativeTime } from '@/lib/utils/format';
import { isEscalation, severityOf, severityTone, sortEscalations } from './mailSignal';

export interface EscalationsPanelProps {
  mail: MailMessage[];
  onOpen: (mail: MailMessage) => void;
  /** When true, drop the panel entirely if there are no escalations (signal-only). */
  hideWhenEmpty?: boolean;
}

/**
 * Signal over noise: the escalations awaiting the operator, most severe first.
 * Escalations have no feed of their own — they're the mail whose subject says so
 * — so this is a focused lens, not a separate query. Severity drives the order
 * and the color; unread items pulse.
 */
export function EscalationsPanel({ mail, onOpen, hideWhenEmpty = false }: EscalationsPanelProps) {
  const escalations = sortEscalations(mail.filter(isEscalation));

  if (hideWhenEmpty && escalations.length === 0) return null;

  return (
    <Panel flush>
      <PanelHeader
        title="Escalations"
        hint={escalations.length ? String(escalations.length) : undefined}
      />
      {escalations.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-6 text-sm text-muted">
          <StatusDot tone="ok" />
          No open escalations — nothing needs authorizing.
        </div>
      ) : (
        <div className="divide-hairline">
          {escalations.map((m) => {
            const severity = severityOf(m);
            const tone = severityTone(severity);
            return (
              <ListRow
                key={m.id}
                interactive
                onClick={() => onOpen(m)}
                leading={<StatusDot tone={tone} pulse={!m.read} />}
                title={
                  <span className={m.read ? 'text-muted' : 'text-fg'}>
                    {m.subject || '(no subject)'}
                  </span>
                }
                subtitle={<span className="font-mono">{m.from}</span>}
                trailing={
                  <>
                    <Badge tone={tone}>{severity}</Badge>
                    <span className="font-mono tabular-nums">{relativeTime(m.timestamp)}</span>
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
