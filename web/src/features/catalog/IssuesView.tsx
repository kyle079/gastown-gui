import { useMemo } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import {
  Badge,
  Dialog,
  Input,
  Panel,
  PanelHeader,
  Select,
  Spinner,
  Table,
  ListRow,
  type Tone,
  type Column,
} from '@/components/primitives';
import { Surface } from '@/components/Surface';
import type { Bead, BeadDetail, Convoy, Agent } from '@/lib/api/types';
import { useBeadDetail, useBeads, useConvoys, usePullRequests, useStatus } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';
import { CatalogPanel } from './CatalogPanel';
import { DetailField } from './DetailField';
import { byUrgency, priorityLabel, priorityTone, statusLabel, statusTone } from './catalogMeta';
import { ActionHubPanel } from '@/features/work/ActionHubPanel';
import { buildIssueHub, type RelatedPullRequest } from '@/features/work/detailHubModel';
import { convoySignal } from '@/features/work/workState';

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

function rigFromAddress(value?: string | null): string | null {
  if (!value) return null;
  const [rig] = value.split('/');
  return rig || null;
}

function relatedPrTone(pr: RelatedPullRequest): Tone {
  if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'danger';
  if (pr.reviewDecision === 'APPROVED') return 'ok';
  if (pr.isDraft) return 'neutral';
  return 'accent';
}

function relatedPrLabel(pr: RelatedPullRequest): string {
  if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'Changes requested';
  if (pr.reviewDecision === 'APPROVED') return 'Approved';
  if (pr.isDraft) return 'Draft';
  return 'Open review';
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
    void navigate({ to: '/investigate', search: (prev) => ({ ...prev, mode: 'issues' as const, status: val, id: undefined }) });
  const setQuery = (val: string) =>
    void navigate({ to: '/investigate', search: (prev) => ({ ...prev, mode: 'issues' as const, q: val || undefined }) });
  const setSelectedId = (id: string | undefined) =>
    void navigate({ to: '/investigate', search: (prev) => ({ ...prev, mode: 'issues' as const, id }) });

  const { data, isLoading, isError, error, refetch } = useBeads(status);
  const {
    data: selected,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useBeadDetail(selectedId);
  const convoyQuery = useConvoys();
  const statusQuery = useStatus();
  const prQuery = usePullRequests('open');
  const hub = useMemo(
    () =>
      selected
        ? buildIssueHub(
            selected,
            convoyQuery.data ?? [],
            statusQuery.data?.agents ?? [],
            prQuery.data ?? [],
          )
        : null,
    [selected, convoyQuery.data, statusQuery.data?.agents, prQuery.data],
  );

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
          empty={
            query
              ? 'No tasks match your filter.'
              : status === 'open'
                ? 'No open tasks — use Dispatch to create new work.'
                : `No tasks in this status.`
          }
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
        {selected && (
          <BeadDetailBody
            bead={selected}
            convoy={hub?.convoy ?? null}
            agent={hub?.agent ?? null}
            rig={hub?.rig ?? null}
            relatedPrs={hub?.relatedPrs ?? []}
            actions={hub?.actions ?? []}
            partialContext={convoyQuery.isError || statusQuery.isError || prQuery.isError}
          />
        )}
      </Dialog>
    </Surface>
  );
}

interface BeadDetailBodyProps {
  bead: BeadDetail;
  convoy: Convoy | null;
  agent: Agent | null;
  rig: string | null;
  relatedPrs: RelatedPullRequest[];
  actions: ReturnType<typeof buildIssueHub>['actions'];
  partialContext: boolean;
}

function BeadDetailBody({
  bead,
  convoy,
  agent,
  rig,
  relatedPrs,
  actions,
  partialContext,
}: BeadDetailBodyProps) {
  const convoyState = convoy ? convoySignal(convoy) : null;
  const fallbackRig = rig ?? rigFromAddress(bead.assignee);

  return (
    <div className="flex flex-col gap-4">
      <ActionHubPanel actions={actions} />

      {partialContext && (
        <p className="text-xs text-faint">
          Linked convoy, runtime, or PR data is partially unavailable. Core bead detail is still current.
        </p>
      )}

      <Panel>
        <PanelHeader title="Current state" hint={bead.id} />
        <div className="grid gap-x-6 gap-y-1 pt-4 sm:grid-cols-2">
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
          </div>
          <div>
            <DetailField label="Created by">
              <span className="font-mono text-xs">{bead.created_by ?? '—'}</span>
            </DetailField>
            <DetailField label="Created">{formatTimestamp(bead.created_at)}</DetailField>
            <DetailField label="Updated">{formatTimestamp(bead.updated_at)}</DetailField>
            <DetailField label="Dependencies">{bead.dependency_count ?? bead.dependencies?.length ?? 0}</DetailField>
            <DetailField label="Dependents">{bead.dependent_count ?? 0}</DetailField>
            <DetailField label="Comments">{bead.comment_count ?? 0}</DetailField>
          </div>
        </div>
      </Panel>

      <Panel flush>
        <PanelHeader title="Related state" hint="connected context" />
        <div className="divide-y divide-line">
          {convoy && convoyState && (
            <ListRow
              title={
                <Link
                  to="/dispatch/$convoyId"
                  params={{ convoyId: convoy.id }}
                  className="hover:text-accent"
                >
                  {convoy.title.replace(/^Work:\s*/i, '').trim() || convoy.title}
                </Link>
              }
              subtitle={
                <span className="font-mono">
                  {convoy.id} · {convoy.completed}/{convoy.total} done
                </span>
              }
              trailing={<Badge tone={convoyState.tone}>{convoyState.label}</Badge>}
            />
          )}

          {agent ? (
            <ListRow
              title={
                fallbackRig ? (
                  <Link to="/fleet/$rig" params={{ rig: fallbackRig }} className="font-mono hover:text-accent">
                    {agent.address}
                  </Link>
                ) : (
                  <span className="font-mono">{agent.address}</span>
                )
              }
              subtitle={agent.hook_bead ? `${agent.state} on ${agent.hook_bead}` : agent.state}
              trailing={
                <>
                  {agent.unread_mail > 0 && <Badge tone="info">{agent.unread_mail} mail</Badge>}
                  <Badge tone={agent.running ? 'accent' : 'danger'}>{agent.running ? 'running' : 'offline'}</Badge>
                </>
              }
            />
          ) : bead.assignee ? (
            <ListRow
              title={
                fallbackRig ? (
                  <Link to="/fleet/$rig" params={{ rig: fallbackRig }} className="font-mono hover:text-accent">
                    {bead.assignee}
                  </Link>
                ) : (
                  <span className="font-mono">{bead.assignee}</span>
                )
              }
              subtitle="Assigned, but live runtime details are not linked right now."
            />
          ) : null}

          {relatedPrs.map((pr) => (
            <ListRow
              key={`${pr.repoFullName}#${pr.number}`}
              title={
                <Link
                  to="/landing/$owner/$repo/$prNumber"
                  params={{ owner: pr.owner, repo: pr.repo, prNumber: String(pr.number) }}
                  className="hover:text-accent"
                >
                  {pr.title}
                </Link>
              }
              subtitle={
                <span className="font-mono">
                  {pr.repoFullName} · #{pr.number}
                  {pr.rig ? ` · ${pr.rig}` : ''}
                </span>
              }
              trailing={<Badge tone={relatedPrTone(pr)}>{relatedPrLabel(pr)}</Badge>}
            />
          ))}

          {!convoy && !agent && !bead.assignee && relatedPrs.length === 0 && (
            <div className="px-4 py-6 text-sm text-faint">
              No linked convoy, runtime, or pull-request context is attached to this bead yet.
            </div>
          )}
        </div>
      </Panel>

      {Array.isArray(bead.dependencies) && bead.dependencies.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-faint">Depends on</p>
          <div className="flex flex-col gap-2">
            {bead.dependencies.map((dependency) => (
              <div key={dependency.id} className="rounded-md border border-line/70 bg-surface px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/investigate"
                      search={{ mode: 'issues' as const, id: dependency.id, status: 'all' }}
                      className="font-mono text-xs text-accent underline-offset-2 hover:underline"
                    >
                      {dependency.id}
                    </Link>
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
