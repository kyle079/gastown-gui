import { useMemo } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { Badge, Input, Table, type Column } from '@/components/primitives';
import type { PullRequest } from '@/lib/api/types';
import { usePullRequests } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';
import { prReview } from '@/features/catalog/catalogMeta';
import { CatalogPanel } from '@/features/catalog/CatalogPanel';
import { cn } from '@/lib/utils/cn';

export interface PrsSearch {
  state: 'open' | 'merged' | 'closed' | 'all';
  q?: string;
}

export function validatePrsSearch(search: Record<string, unknown>): PrsSearch {
  const validStates = ['open', 'merged', 'closed', 'all'] as const;
  const state = validStates.includes(search.state as (typeof validStates)[number])
    ? (search.state as PrsSearch['state'])
    : 'open';
  return {
    state,
    q: typeof search.q === 'string' ? search.q : undefined,
  };
}

const STATE_TABS: { value: PrsSearch['state']; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'merged', label: 'Merged' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

/** Extract a bead ID from a branch name: "polecat/chrome/gg-2q5@session" → "gg-2q5". */
function beadFromBranch(branch?: string): string | undefined {
  if (!branch) return undefined;
  const last = branch.split('/').pop();
  if (!last) return undefined;
  const id = last.includes('@') ? last.slice(0, last.indexOf('@')) : last;
  return /^[a-z]+-[a-z0-9]+$/.test(id) ? id : undefined;
}

function matches(pr: PullRequest, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    pr.title.toLowerCase().includes(needle) ||
    String(pr.number).includes(needle) ||
    (pr.repo ?? '').toLowerCase().includes(needle) ||
    (pr.headRefName ?? '').toLowerCase().includes(needle) ||
    (pr.author?.login ?? '').toLowerCase().includes(needle) ||
    (pr.rig ?? '').toLowerCase().includes(needle)
  );
}

function PrTitle({ pr }: { pr: PullRequest }) {
  const beadId = beadFromBranch(pr.headRefName);
  return (
    <div className="min-w-0">
      <span className="text-fg">{pr.title}</span>
      {pr.headRefName && (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-2xs text-faint">{pr.headRefName}</span>
          {beadId && (
            <Link
              to="/catalog"
              search={{ tab: 'issues', id: beadId }}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-2xs text-accent underline-offset-2 hover:underline"
            >
              {beadId}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function RigLink({ rig }: { rig?: string }) {
  if (!rig) return <span className="text-faint">—</span>;
  return (
    <Link
      to="/rigs/$rig"
      params={{ rig }}
      onClick={(e) => e.stopPropagation()}
      className="font-mono text-xs text-accent underline-offset-2 hover:underline"
    >
      {rig}
    </Link>
  );
}

const columns: Column<PullRequest>[] = [
  {
    key: 'number',
    header: 'PR',
    width: '6%',
    cell: (pr) => <span className="font-mono text-xs text-muted">#{pr.number}</span>,
  },
  {
    key: 'title',
    header: 'Title',
    primary: true,
    cell: (pr) => <PrTitle pr={pr} />,
  },
  {
    key: 'rig',
    header: 'Rig',
    width: '16%',
    cell: (pr) => <RigLink rig={pr.rig} />,
  },
  {
    key: 'author',
    header: 'Author',
    width: '12%',
    cell: (pr) => <span className="font-mono text-xs text-muted">{pr.author?.login ?? '—'}</span>,
  },
  {
    key: 'review',
    header: 'Review',
    width: '11%',
    cell: (pr) => {
      const r = prReview(pr);
      return <Badge tone={r.tone}>{r.label}</Badge>;
    },
  },
  {
    key: 'updated',
    header: 'Updated',
    align: 'right',
    width: '9%',
    cell: (pr) => (
      <span className="font-mono text-xs tabular-nums text-faint">{relativeTime(pr.updatedAt)}</span>
    ),
  },
];

/**
 * Pull requests — own top-level page at /prs. Shows Open / Merged / Closed / All
 * states (tab = URL search param). Clicking a PR navigates to the in-app detail
 * view; rig name links to /rigs/$rig; bead ID links to the issue in Catalog.
 */
export function PullRequestsPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as PrsSearch;

  const state = search.state ?? 'open';
  const query = search.q ?? '';

  const setSearch = (updates: Partial<PrsSearch>) =>
    void navigate({ to: '/prs', search: (prev) => ({ ...prev, state: prev.state ?? 'open', ...updates }) });

  const { data, isLoading, isError, error, refetch } = usePullRequests(state);
  const rows = useMemo(() => (data ?? []).filter((pr) => matches(pr, query)), [data, query]);

  const total = data?.length ?? 0;
  const hint = query ? `${rows.length} of ${total}` : String(total);

  const openPr = (pr: PullRequest) => {
    if (!pr.repo) return;
    const [owner, repo] = pr.repo.split('/');
    if (owner && repo) {
      void navigate({ to: '/prs/$owner/$repo/$prNumber', params: { owner, repo, prNumber: String(pr.number) } });
    } else if (pr.url) {
      // Fallback for repos without owner/repo format: plain anchor navigation
      window.location.href = pr.url;
    }
  };

  return (
    <Surface
      title="Pull requests"
      description="Open code review across every rig. Filter by state, search by title or branch."
    >
      <div className="flex flex-col gap-4">
        {/* State tabs */}
        <div
          role="tablist"
          aria-label="PR states"
          className="inline-flex w-full gap-0.5 rounded-md border border-line bg-surface p-0.5 sm:w-auto"
        >
          {STATE_TABS.map((t) => {
            const isActive = t.value === state;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSearch({ state: t.value })}
                className={cn(
                  'flex-1 rounded px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:py-1.5',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                  isActive ? 'bg-raised text-fg' : 'text-muted hover:text-fg',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <CatalogPanel
          title="PRs"
          hint={hint}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          filters={
            <Input
              type="search"
              placeholder="Filter by title, repo, branch, or author…"
              value={query}
              onChange={(e) => setSearch({ q: e.target.value || undefined })}
              className="sm:max-w-xs"
            />
          }
        >
          <Table
            columns={columns}
            rows={rows}
            rowKey={(pr) => `${pr.repo ?? ''}#${pr.number}`}
            onRowClick={openPr}
            empty={query ? 'No pull requests match your filter.' : `No ${state === 'all' ? '' : state + ' '}pull requests.`}
          />
        </CatalogPanel>
      </div>
    </Surface>
  );
}
