import { useMemo, useState } from 'react';
import { Badge, Input, Select, Table, type Column } from '@/components/primitives';
import type { PullRequest } from '@/lib/api/types';
import { usePullRequests } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';
import { CatalogPanel } from './CatalogPanel';
import { prReview } from './catalogMeta';

const STATE_FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'merged', label: 'Merged' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

function matches(pr: PullRequest, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    pr.title.toLowerCase().includes(needle) ||
    String(pr.number).includes(needle) ||
    (pr.repo ?? '').toLowerCase().includes(needle) ||
    (pr.headRefName ?? '').toLowerCase().includes(needle) ||
    (pr.author?.login ?? '').toLowerCase().includes(needle)
  );
}

const columns: Column<PullRequest>[] = [
  {
    key: 'number',
    header: 'PR',
    width: '8%',
    cell: (pr) => <span className="font-mono text-xs text-muted">#{pr.number}</span>,
  },
  {
    key: 'title',
    header: 'Title',
    cell: (pr) => <span className="text-fg">{pr.title}</span>,
  },
  {
    key: 'repo',
    header: 'Repo',
    width: '16%',
    cell: (pr) => <span className="font-mono text-xs text-faint">{pr.repo ?? '—'}</span>,
  },
  {
    key: 'author',
    header: 'Author',
    width: '14%',
    cell: (pr) => <span className="font-mono text-xs text-muted">{pr.author?.login ?? '—'}</span>,
  },
  {
    key: 'review',
    header: 'Review',
    width: '12%',
    cell: (pr) => {
      const r = prReview(pr);
      return <Badge tone={r.tone}>{r.label}</Badge>;
    },
  },
  {
    key: 'updated',
    header: 'Updated',
    align: 'right',
    width: '10%',
    cell: (pr) => (
      <span className="font-mono text-xs tabular-nums text-faint">{relativeTime(pr.updatedAt)}</span>
    ),
  },
];

export function PullRequestsView() {
  const [state, setState] = useState('open');
  const [query, setQuery] = useState('');

  const { data, isLoading, isError, error, refetch } = usePullRequests(state);

  const rows = useMemo(() => (data ?? []).filter((pr) => matches(pr, query)), [data, query]);

  const total = data?.length ?? 0;
  const hint = query ? `${rows.length} of ${total}` : String(total);

  const openPr = (pr: PullRequest) => {
    if (pr.url) window.open(pr.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <CatalogPanel
      title="Pull requests"
      hint={hint}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => void refetch()}
      filters={
        <>
          <Input
            type="search"
            placeholder="Filter by title, repo, branch, or author…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="sm:w-44"
            aria-label="State filter"
          >
            {STATE_FILTERS.map((f) => (
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
        rowKey={(pr) => `${pr.repo ?? ''}#${pr.number}`}
        onRowClick={openPr}
        empty={query ? 'No pull requests match your filter.' : 'No open pull requests.'}
      />
    </CatalogPanel>
  );
}
