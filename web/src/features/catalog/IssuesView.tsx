import { useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  Badge,
  Dialog,
  Input,
  Select,
  Table,
  type Column,
} from '@/components/primitives';
import type { Bead } from '@/lib/api/types';
import { useBeads } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';
import { CatalogPanel } from './CatalogPanel';
import { DetailField } from './DetailField';
import { byUrgency, priorityLabel, priorityTone, statusLabel, statusTone } from './catalogMeta';

const STATUS_FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

function matches(bead: Bead, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    bead.id.toLowerCase().includes(needle) ||
    bead.title.toLowerCase().includes(needle) ||
    (bead.issue_type ?? '').toLowerCase().includes(needle)
  );
}

const columns: Column<Bead>[] = [
  {
    key: 'priority',
    header: 'Pri',
    width: '8%',
    cell: (b) => <Badge tone={priorityTone(b.priority)}>{priorityLabel(b.priority)}</Badge>,
  },
  {
    key: 'id',
    header: 'ID',
    width: '12%',
    cell: (b) => <span className="font-mono text-xs text-muted">{b.id}</span>,
  },
  {
    key: 'title',
    header: 'Title',
    primary: true,
    cell: (b) => <span className="text-fg">{b.title}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    width: '12%',
    cell: (b) => <span className="font-mono text-xs text-faint">{b.issue_type ?? '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    width: '14%',
    cell: (b) => <Badge tone={statusTone(b.status)}>{statusLabel(b.status)}</Badge>,
  },
  {
    key: 'updated',
    header: 'Updated',
    align: 'right',
    width: '10%',
    cell: (b) => (
      <span className="font-mono text-xs tabular-nums text-faint">{relativeTime(b.updated_at)}</span>
    ),
  },
];

/**
 * Issues tab of the Catalog. Filters (status, search query) and the selected
 * issue ID all live in URL search params so the view deep-links and filters
 * survive navigation and sharing.
 */
export function IssuesView() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { status?: string; q?: string; id?: string };

  const status = search.status ?? 'open';
  const query = search.q ?? '';
  const selectedId = search.id;

  const setStatus = (val: string) =>
    void navigate({ to: '/catalog', search: (prev) => ({ ...prev, tab: prev.tab ?? 'issues', status: val, id: undefined }) });
  const setQuery = (val: string) =>
    void navigate({ to: '/catalog', search: (prev) => ({ ...prev, tab: prev.tab ?? 'issues', q: val || undefined }) });
  const setSelectedId = (id: string | undefined) =>
    void navigate({ to: '/catalog', search: (prev) => ({ ...prev, tab: prev.tab ?? 'issues', id }) });

  const { data, isLoading, isError, error, refetch } = useBeads(status);

  const rows = useMemo(() => {
    const beads = data ?? [];
    return beads.filter((b) => matches(b, query)).sort(byUrgency);
  }, [data, query]);

  const selected = selectedId ? (data ?? []).find((b) => b.id === selectedId) ?? null : null;

  const total = data?.length ?? 0;
  const hint = query ? `${rows.length} of ${total}` : String(total);

  return (
    <>
      <CatalogPanel
        title="Issues"
        hint={hint}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        filters={
          <>
            <Input
              type="search"
              placeholder="Filter by id, title, or type…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="sm:w-44"
              aria-label="Status filter"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </>
        }
      >
        <Table
          columns={columns}
          rows={rows}
          rowKey={(b) => b.id}
          onRowClick={(b) => setSelectedId(b.id)}
          empty={query ? 'No issues match your filter.' : 'No issues in this status.'}
        />
      </CatalogPanel>

      <Dialog
        open={selected != null}
        onClose={() => setSelectedId(undefined)}
        title={selected ? <span className="font-mono text-xs text-muted">{selected.id}</span> : undefined}
        description={selected?.title}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div>
              <DetailField label="Status">
                <Badge tone={statusTone(selected.status)}>{statusLabel(selected.status)}</Badge>
              </DetailField>
              <DetailField label="Priority">
                <Badge tone={priorityTone(selected.priority)}>{priorityLabel(selected.priority)}</Badge>
              </DetailField>
              <DetailField label="Type">{selected.issue_type ?? '—'}</DetailField>
              <DetailField label="Owner">
                <span className="font-mono text-xs">{selected.owner ?? '—'}</span>
              </DetailField>
              <DetailField label="Updated">{relativeTime(selected.updated_at)}</DetailField>
            </div>
            {selected.description && (
              <div>
                <p className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-faint">
                  Description
                </p>
                <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm text-muted">
                  {selected.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
