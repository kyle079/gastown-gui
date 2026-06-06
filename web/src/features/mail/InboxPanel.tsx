import { useMemo, useState } from 'react';
import {
  Panel,
  PanelHeader,
  Table,
  Badge,
  Select,
  StatusDot,
  type Column,
} from '@/components/primitives';
import type { MailMessage } from '@/lib/api/types';
import { relativeTime, pluralize } from '@/lib/utils/format';
import { isEscalation, mailSignal, severityOf, severityTone, sortInbox } from './mailSignal';

type Filter = 'all' | 'unread' | 'action';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All mail' },
  { value: 'unread', label: 'Unread' },
  { value: 'action', label: 'Action needed' },
];

/** "Action needed" = anything urgent — escalations, crashes, recovery requests. */
function isActionNeeded(m: MailMessage): boolean {
  const tone = mailSignal(m).tone;
  return tone === 'danger' || tone === 'warn';
}

const columns: Column<MailMessage>[] = [
  {
    key: 'signal',
    header: 'Signal',
    width: '13%',
    cell: (m) => {
      if (isEscalation(m)) {
        const sev = severityOf(m);
        return <Badge tone={severityTone(sev)}>{sev}</Badge>;
      }
      const s = mailSignal(m);
      return <Badge tone={s.tone}>{s.label}</Badge>;
    },
  },
  {
    key: 'from',
    header: 'From',
    width: '26%',
    cell: (m) => <span className="font-mono text-xs text-muted">{m.from || '—'}</span>,
  },
  {
    key: 'subject',
    header: 'Subject',
    primary: true,
    cell: (m) => (
      <span className="flex items-center gap-2">
        <StatusDot
          tone={m.read ? 'neutral' : 'accent'}
          className={m.read ? 'opacity-0' : undefined}
        />
        <span className={m.read ? 'truncate text-muted' : 'truncate font-medium text-fg'}>
          {m.subject || '(no subject)'}
        </span>
      </span>
    ),
  },
  {
    key: 'when',
    header: 'When',
    align: 'right',
    width: '12%',
    cell: (m) => (
      <span className="font-mono tabular-nums text-xs text-faint">{relativeTime(m.timestamp)}</span>
    ),
  },
];

export interface InboxPanelProps {
  mail: MailMessage[];
  onOpen: (mail: MailMessage) => void;
}

/** The full inbox — every message, filterable, newest/unread first. */
export function InboxPanel({ mail, onOpen }: InboxPanelProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    let list = mail;
    if (filter === 'unread') list = list.filter((m) => !m.read);
    else if (filter === 'action') list = list.filter(isActionNeeded);
    return sortInbox(list);
  }, [mail, filter]);

  const unread = mail.filter((m) => !m.read).length;

  return (
    <Panel flush>
      <PanelHeader
        title="Inbox"
        hint={unread ? `${unread} unread` : pluralize(mail.length, 'message')}
        actions={
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="h-7 w-36 text-xs"
            aria-label="Filter mail"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        }
      />
      <Table
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        onRowClick={onOpen}
        empty={filter === 'all' ? 'Inbox is empty' : 'Nothing matches this filter'}
      />
    </Panel>
  );
}
