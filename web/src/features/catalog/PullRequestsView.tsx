import { useMemo, useState } from 'react';
import { Badge, Panel, Select, Table, type Column, type Tone } from '@/components/primitives';
import { relativeTime } from '@/lib/utils/format';
import type { PullRequest } from '@/lib/api/types';
import { usePullRequests } from '@/lib/query/hooks';
import { filterPullRequests } from './catalog';
import { Toolbar, LoadingState, ErrorState } from './CatalogChrome';

const STATE_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'merged', label: 'Merged' },
  { value: 'all', label: 'All' },
];

function reviewTone(decision: string | null | undefined): Tone {
  switch (decision) {
    case 'APPROVED':
      return 'ok';
    case 'CHANGES_REQUESTED':
      return 'danger';
    case 'REVIEW_REQUIRED':
      return 'warn';
    default:
      return 'neutral';
  }
}

/** PRs segment — open pull requests across the rigs. Rows open the PR on GitHub. */
export function PullRequestsView({ active }: { active: boolean }) {
  const [state, setState] = useState('open');
  const [query, setQuery] = useState('');

  const { data, isLoading, isError, error, refetch } = usePullRequests(state, active);
  const prs = useMemo(() => data ?? [], [data]);
  const rows = useMemo(() => filterPullRequests(prs, query), [prs, query]);

  const columns: Column<PullRequest>[] = [
    {
      key: 'number',
      header: 'PR',
      width: '64px',
      cell: (p) => <span className="font-mono text-xs text-muted">#{p.number}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      className: 'max-w-0',
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate md:max-w-[32ch] lg:max-w-[44ch]">{p.title}</span>
          {p.isDraft && <Badge>draft</Badge>}
        </span>
      ),
    },
    {
      key: 'repo',
      header: 'Repo',
      width: '140px',
      cell: (p) => <span className="truncate font-mono text-2xs text-faint">{p.repo ?? '—'}</span>,
    },
    {
      key: 'author',
      header: 'Author',
      width: '120px',
      cell: (p) => <span className="text-xs text-faint">{p.author?.login ?? '—'}</span>,
    },
    {
      key: 'review',
      header: 'Review',
      width: '128px',
      cell: (p) =>
        p.reviewDecision ? (
          <Badge tone={reviewTone(p.reviewDecision)}>
            {p.reviewDecision.replace(/_/g, ' ').toLowerCase()}
          </Badge>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      key: 'updated',
      header: 'Updated',
      width: '80px',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-2xs text-faint">{relativeTime(p.updatedAt)}</span>
      ),
    },
  ];

  if (isLoading) return <LoadingState label="Loading pull requests…" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search PRs — title, branch, author…"
        filter={
          <Select
            value={state}
            onChange={(e) => setState(e.target.value)}
            aria-label="Filter by state"
            className="sm:w-36"
          >
            {STATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        }
        count={`${rows.length} of ${prs.length}`}
      />

      <Panel flush>
        <Table
          columns={columns}
          rows={rows}
          rowKey={(p) => `${p.repo}#${p.number}`}
          onRowClick={(p) => window.open(p.url, '_blank', 'noopener,noreferrer')}
          empty={
            query ? 'No pull requests match.' : 'No open pull requests across the fleet.'
          }
        />
      </Panel>
    </>
  );
}
