import { useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  Badge,
  Dialog,
  Input,
  Select,
  Spinner,
  Table,
  type Column,
} from '@/components/primitives';
import { Surface } from '@/components/Surface';
import type { Bead, BeadDetail } from '@/lib/api/types';
import { useBeadDetail, useBeads } from '@/lib/query/hooks';
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

export interface IssuesSearch {
  status?: string;
  q?: string;
  id?: string;
}

export function validateIssuesSearch(search: Record<string, unknown>): IssuesSearch {
  return {
    status: typeof search.status === 'string' ? search.status : undefined,
    q: typeof search.q === 'string' ? search.q : undefined,
    id: typeof search.id === 'string' ? search.id : undefined,
  };
}

function matches(bead: Bead, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    bead.id.toLowerCase().includes(needle) ||
    bead.title.toLowerCase().includes(needle) ||
    (bead.issue_type ?? '').toLowerCase().includes(needle)
  );
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString()} · ${relativeTime(value)}`;
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
 * Issues surface. Filters and selected issue ID live in URL search params so
 * the page deep-links cleanly and a bead can be opened directly from elsewhere.
 */
export function IssuesView() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as IssuesSearch;

  const status = search.status ?? 'open';
  const query = search.q ?? '';
  const selectedId = search.id;

  const setStatus = (val: string) =>
    void navigate({ to: '/issues', search: (prev) => ({ ...prev, status: val, id: undefined }) });
  const setQuery = (val: string) =>
    void navigate({ to: '/issues', search: (prev) => ({ ...prev, q: val || undefined }) });
  const setSelectedId = (id: string | undefined) =>
    void navigate({ to: '/issues', search: (prev) => ({ ...prev, id }) });

  const { data, isLoading, isError, error, refetch } = useBeads(status);
  const {
    data: selected,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useBeadDetail(selectedId);

  const rows = useMemo(() => {
    const beads = data ?? [];
    return beads.filter((b) => matches(b, query)).sort(byUrgency);
  }, [data, query]);

  const total = data?.length ?? 0;
  const hint = query ? `${rows.length} of ${total}` : String(total);

  return (
    <Surface
      title="Issues"
      description="Town beads in one place. Filter by workflow state, then open a bead for deeper context."
    >
      <CatalogPanel
        title="Beads"
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
        open={selectedId != null}
        onClose={() => setSelectedId(undefined)}
        title={selectedId ? <span className="font-mono text-xs text-muted">{selectedId}</span> : undefined}
        description={selected?.title}
      >
        {isDetailLoading && (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted">
            <Spinner />
            Loading bead detail…
          </div>
        )}
        {isDetailError && (
          <div className="py-8 text-sm text-muted">
            {detailError instanceof Error ? detailError.message : 'Could not load bead detail.'}
          </div>
        )}
        {selected && <BeadDetailBody bead={selected} />}
      </Dialog>
    </Surface>
  );
}

function BeadDetailBody({ bead }: { bead: BeadDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <DetailField label="Status">
          <Badge tone={statusTone(bead.status)}>{statusLabel(bead.status)}</Badge>
        </DetailField>
        <DetailField label="Priority">
          <Badge tone={priorityTone(bead.priority)}>{priorityLabel(bead.priority)}</Badge>
        </DetailField>
        <DetailField label="Type">{bead.issue_type ?? '—'}</DetailField>
        <DetailField label="Assignee">
          <span className="font-mono text-xs">{bead.assignee ?? '—'}</span>
        </DetailField>
        <DetailField label="Owner">
          <span className="font-mono text-xs">{bead.owner ?? '—'}</span>
        </DetailField>
        <DetailField label="Created by">
          <span className="font-mono text-xs">{bead.created_by ?? '—'}</span>
        </DetailField>
        <DetailField label="Created">{formatTimestamp(bead.created_at)}</DetailField>
        <DetailField label="Updated">{formatTimestamp(bead.updated_at)}</DetailField>
        <DetailField label="Dependencies">{bead.dependency_count ?? bead.dependencies?.length ?? 0}</DetailField>
        <DetailField label="Dependents">{bead.dependent_count ?? 0}</DetailField>
        <DetailField label="Comments">{bead.comment_count ?? 0}</DetailField>
      </div>

      {Array.isArray(bead.dependencies) && bead.dependencies.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-faint">Depends on</p>
          <div className="flex flex-col gap-2">
            {bead.dependencies.map((dependency) => (
              <div key={dependency.id} className="rounded-md border border-line/70 bg-surface px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted">{dependency.id}</p>
                    <p className="truncate text-sm text-fg">{dependency.title}</p>
                  </div>
                  <Badge tone={statusTone(dependency.status)}>
                    {dependency.dependency_type ?? statusLabel(dependency.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bead.description && (
        <div>
          <p className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-faint">
            Description
          </p>
          <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm text-muted">
            {bead.description}
          </p>
        </div>
      )}
    </div>
  );
}
