import { useMemo, useState } from 'react';
import {
  Badge,
  Dialog,
  Panel,
  Select,
  StatusPill,
  Table,
  type Column,
} from '@/components/primitives';
import { relativeTime } from '@/lib/utils/format';
import type { Bead } from '@/lib/api/types';
import { useBeads } from '@/lib/query/hooks';
import { filterBeads, priorityMeta, statusTone } from './catalog';
import { Toolbar, LoadingState, ErrorState } from './CatalogChrome';

const STATUS_OPTIONS = [
  { value: '', label: 'Active' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'closed', label: 'Closed' },
];

/** Issues segment — the bead list. Search + status filter; rows open a read-only detail. */
export function IssuesView({ active }: { active: boolean }) {
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Bead | null>(null);

  const { data, isLoading, isError, error, refetch } = useBeads(status, active);
  const beads = useMemo(() => data ?? [], [data]);
  const rows = useMemo(() => filterBeads(beads, query), [beads, query]);

  const columns: Column<Bead>[] = [
    {
      key: 'priority',
      header: 'Pri',
      width: '56px',
      cell: (b) => {
        const { label, tone } = priorityMeta(b.priority);
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: 'id',
      header: 'ID',
      width: '96px',
      cell: (b) => <span className="font-mono text-xs text-muted">{b.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      className: 'max-w-0',
      cell: (b) => <span className="block truncate md:max-w-[36ch] lg:max-w-[52ch]">{b.title}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      width: '88px',
      cell: (b) => <span className="text-xs text-faint">{b.issue_type ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '128px',
      cell: (b) => <StatusPill tone={statusTone(b.status)} label={b.status.replace(/_/g, ' ')} />,
    },
    {
      key: 'updated',
      header: 'Updated',
      width: '80px',
      align: 'right',
      cell: (b) => (
        <span className="font-mono text-2xs text-faint">{relativeTime(b.updated_at)}</span>
      ),
    },
  ];

  if (isLoading) return <LoadingState label="Loading issues…" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search issues — id, title, owner…"
        filter={
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="sm:w-40"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        }
        count={`${rows.length} of ${beads.length}`}
      />

      <Panel flush>
        <Table
          columns={columns}
          rows={rows}
          rowKey={(b) => b.id}
          onRowClick={setSelected}
          empty={query ? 'No issues match.' : 'No issues.'}
        />
      </Panel>

      <IssueDialog bead={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function IssueDialog({ bead, onClose }: { bead: Bead | null; onClose: () => void }) {
  if (!bead) return null;
  const { label, tone } = priorityMeta(bead.priority);
  return (
    <Dialog
      open={!!bead}
      onClose={onClose}
      title={bead.title}
      description={<span className="font-mono">{bead.id}</span>}
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{label}</Badge>
          <StatusPill tone={statusTone(bead.status)} label={bead.status.replace(/_/g, ' ')} />
          {bead.issue_type && <Badge>{bead.issue_type}</Badge>}
          {bead.owner && <span className="text-xs text-faint">{bead.owner}</span>}
        </div>

        {bead.description ? (
          <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-muted">
            {bead.description}
          </pre>
        ) : (
          <p className="text-sm text-faint">No description.</p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs">
          <Meta label="Created" value={relativeTime(bead.created_at)} />
          <Meta label="Updated" value={relativeTime(bead.updated_at)} />
          {bead.created_by && <Meta label="By" value={bead.created_by} />}
          {bead.dependency_count != null && (
            <Meta label="Dependencies" value={String(bead.dependency_count)} />
          )}
        </dl>
      </div>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-faint">{label}</dt>
      <dd className="truncate font-mono text-muted">{value}</dd>
    </div>
  );
}
