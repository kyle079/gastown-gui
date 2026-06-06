import { useMemo } from 'react';
import { Panel, PanelHeader, Table, Badge, StatusDot, type Column } from '@/components/primitives';
import { relativeTime } from '@/lib/utils/format';
import type { MailMessage } from '@/lib/api/types';
import { compareInbox, mailSignal } from './mailSignal';

/**
 * The full inbox — every message, unread-first then newest. Escalations already
 * lead the surface above this, so the inbox is the calm chronological record:
 * one row per message, a signal chip for category, click to read. Reflows to
 * stacked cards on a phone via the Table primitive.
 */
export function Inbox({
  mail,
  onSelect,
}: {
  mail: MailMessage[];
  onSelect: (mail: MailMessage) => void;
}) {
  const rows = useMemo(() => [...mail].sort(compareInbox), [mail]);

  const columns: Column<MailMessage>[] = [
    {
      key: 'from',
      header: 'From',
      width: '22%',
      cell: (m) => (
        <span className="flex items-center gap-2">
          <StatusDot tone={m.read ? 'neutral' : 'accent'} />
          <span className="truncate font-mono text-xs">{m.from}</span>
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      cell: (m) => (
        <span className={m.read ? 'text-muted' : 'font-medium text-fg'}>
          {m.subject || '(no subject)'}
        </span>
      ),
    },
    {
      key: 'signal',
      header: 'Signal',
      width: '12%',
      cell: (m) => {
        const sig = mailSignal(m);
        if (sig.key === 'note') return <span className="text-faint">—</span>;
        return <Badge tone={sig.tone}>{sig.label}</Badge>;
      },
    },
    {
      key: 'time',
      header: 'Time',
      align: 'right',
      width: '10%',
      cell: (m) => (
        <span className="font-mono tabular-nums text-faint">{relativeTime(m.timestamp)}</span>
      ),
    },
  ];

  return (
    <Panel flush>
      <PanelHeader title="Inbox" hint={`${mail.length} total`} />
      <Table
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        onRowClick={onSelect}
        empty="Inbox is empty."
      />
    </Panel>
  );
}
