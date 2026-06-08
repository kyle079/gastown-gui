import { useMemo, useState } from 'react';
import { Badge, Button, ListRow, Panel, PanelHeader, Select, StatusDot } from '@/components/primitives';
import { pluralize, relativeTime } from '@/lib/utils/format';
import type { Escalation, MailMessage } from '@/lib/api/types';
import {
  buildMailQueue,
  filterMailQueue,
  queueSummary,
  type MailQueueItem,
  type QueueFilter,
} from './queueModel';

const FILTERS: { value: QueueFilter; label: string }[] = [
  { value: 'all', label: 'All items' },
  { value: 'action', label: 'Action now' },
  { value: 'unread', label: 'Unread' },
  { value: 'escalations', label: 'Escalations' },
];

export interface MailQueuePanelProps {
  mail: MailMessage[];
  escalations: Escalation[];
  defaultFilter?: QueueFilter;
  onOpenMail: (mail: MailMessage) => void;
  onAckEscalation?: (id: string) => void;
  onCloseEscalation?: (id: string) => void;
}

export function MailQueuePanel({
  mail,
  escalations,
  defaultFilter = 'all',
  onOpenMail,
  onAckEscalation,
  onCloseEscalation,
}: MailQueuePanelProps) {
  const [filter, setFilter] = useState<QueueFilter>(defaultFilter);
  const queue = useMemo(() => buildMailQueue(mail, escalations), [mail, escalations]);
  const rows = useMemo(() => filterMailQueue(queue, filter), [queue, filter]);
  const summary = useMemo(() => queueSummary(queue), [queue]);

  return (
    <Panel flush>
      <PanelHeader
        title="Queue"
        hint={summary.action ? `${summary.action} action` : pluralize(summary.total, 'item')}
        actions={
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as QueueFilter)}
            className="h-7 w-36 text-xs"
            aria-label="Filter queue"
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        }
      />

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-faint">
          {filter === 'all'
            ? 'Queue is clear — no messages, escalations, or blocked work.'
            : 'Nothing matches this filter.'}
        </div>
      ) : (
        <div className="divide-hairline">
          {rows.map((item) => (
            <QueueRow
              key={`${item.kind}:${item.id}`}
              item={item}
              onOpenMail={onOpenMail}
              onAckEscalation={onAckEscalation}
              onCloseEscalation={onCloseEscalation}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

interface QueueRowProps {
  item: MailQueueItem;
  onOpenMail: (mail: MailMessage) => void;
  onAckEscalation?: (id: string) => void;
  onCloseEscalation?: (id: string) => void;
}

function QueueRow({ item, onOpenMail, onAckEscalation, onCloseEscalation }: QueueRowProps) {
  const interactive = item.kind === 'mail' && Boolean(item.mail);

  return (
    <ListRow
      interactive={interactive}
      onClick={interactive ? () => onOpenMail(item.mail!) : undefined}
      leading={<StatusDot tone={item.tone} pulse={item.actionState === 'needs_ack'} />}
      title={<span className={item.kind === 'mail' && item.read ? 'text-muted' : undefined}>{item.title}</span>}
      subtitle={<span className="font-mono">{item.source}</span>}
      trailing={
        <div
          className="flex flex-wrap items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Badge tone={item.tone}>{item.signalLabel}</Badge>
          <Badge tone={actionTone(item.actionState)}>{item.actionLabel}</Badge>
          <span className="font-mono tabular-nums text-xs text-faint">{relativeTime(item.timestamp)}</span>
          {item.kind === 'escalation' && item.actionState === 'needs_ack' && onAckEscalation && (
            <Button size="sm" variant="ghost" onClick={() => onAckEscalation(item.id)}>
              Ack
            </Button>
          )}
          {item.kind === 'escalation' && onCloseEscalation && (
            <Button size="sm" variant="ghost" onClick={() => onCloseEscalation(item.id)}>
              Close
            </Button>
          )}
        </div>
      }
    />
  );
}

function actionTone(state: MailQueueItem['actionState']): 'danger' | 'warn' | 'accent' | 'neutral' {
  switch (state) {
    case 'needs_ack':
      return 'danger';
    case 'needs_review':
      return 'warn';
    case 'unread':
      return 'accent';
    default:
      return 'neutral';
  }
}
