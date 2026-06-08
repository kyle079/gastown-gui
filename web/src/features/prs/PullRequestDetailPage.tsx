import { useNavigate, useParams } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { Panel, PanelHeader, PanelBody, Badge, Button, Spinner, type Tone } from '@/components/primitives';
import { usePullRequestDetail } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';
import type {
  PullRequestDetail,
  PullRequestFile,
  PullRequestReview,
  PullRequestComment,
  CheckRun,
} from '@/lib/api/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stateTone(pr: PullRequestDetail): Tone {
  if (pr.merged) return 'accent';
  if (pr.state === 'closed') return 'neutral';
  if (pr.draft) return 'neutral';
  return 'ok';
}

function stateLabel(pr: PullRequestDetail): string {
  if (pr.merged) return 'Merged';
  if (pr.state === 'closed') return 'Closed';
  if (pr.draft) return 'Draft';
  return 'Open';
}

function checkTone(c: CheckRun): Tone {
  if (c.conclusion === 'success') return 'ok';
  if (c.conclusion === 'failure') return 'danger';
  if (c.status === 'in_progress') return 'accent';
  return 'neutral';
}

function reviewTone(r: PullRequestReview): Tone {
  if (r.state === 'APPROVED') return 'ok';
  if (r.state === 'CHANGES_REQUESTED') return 'danger';
  if (r.state === 'DISMISSED') return 'neutral';
  return 'neutral';
}

function fileTone(f: PullRequestFile): Tone {
  if (f.status === 'added') return 'ok';
  if (f.status === 'removed') return 'danger';
  return 'neutral';
}

/** Minimal markdown-to-plain rendering: escape HTML, preserve line structure. */
function MarkdownBody({ text }: { text: string }) {
  if (!text.trim()) return <p className="text-sm text-faint italic">No description.</p>;
  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-fg">
      {text}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Sub-sections
// ---------------------------------------------------------------------------

function FilesSection({ files }: { files: PullRequestFile[] }) {
  if (files.length === 0) return null;
  return (
    <Panel flush>
      <PanelHeader title="Files changed" hint={String(files.length)} />
      <div className="divide-y divide-line">
        {files.map((f) => (
          <div key={f.filename} className="flex items-center gap-3 px-4 py-2 text-xs">
            <Badge tone={fileTone(f)} className="shrink-0 capitalize">
              {f.status}
            </Badge>
            <span className="min-w-0 flex-1 truncate font-mono text-fg">{f.filename}</span>
            <span className="shrink-0 tabular-nums text-faint">
              <span className="text-ok">+{f.additions}</span>
              {' '}
              <span className="text-danger">−{f.deletions}</span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ChecksSection({ checks }: { checks: CheckRun[] }) {
  if (checks.length === 0) return null;
  return (
    <Panel flush>
      <PanelHeader title="Checks" hint={String(checks.length)} />
      <div className="divide-y divide-line">
        {checks.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-2 text-xs">
            <Badge tone={checkTone(c)} className="shrink-0">
              {c.conclusion ?? c.status}
            </Badge>
            <span className="min-w-0 flex-1 truncate text-fg">{c.name}</span>
            {c.app && <span className="shrink-0 text-faint">{c.app}</span>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ReviewsSection({ reviews }: { reviews: PullRequestReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <Panel flush>
      <PanelHeader title="Reviews" hint={String(reviews.length)} />
      <div className="divide-y divide-line">
        {reviews.map((r) => (
          <div key={r.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fg">{r.user ?? 'Unknown'}</span>
              <Badge tone={reviewTone(r)}>{r.state.replace(/_/g, ' ')}</Badge>
              {r.submittedAt && (
                <span className="ml-auto text-xs text-faint">{relativeTime(r.submittedAt)}</span>
              )}
            </div>
            {r.body && (
              <p className="text-xs leading-relaxed text-muted whitespace-pre-wrap break-words">
                {r.body}
              </p>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CommentsSection({ comments }: { comments: PullRequestComment[] }) {
  if (comments.length === 0) return null;
  return (
    <Panel flush>
      <PanelHeader title="Comments" hint={String(comments.length)} />
      <div className="divide-y divide-line">
        {comments.map((c) => (
          <div key={c.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fg">{c.user ?? 'Unknown'}</span>
              <span className="ml-auto text-xs text-faint">{relativeTime(c.createdAt)}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted whitespace-pre-wrap break-words">
              {c.body}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Main detail view
// ---------------------------------------------------------------------------

function PrDetail({ pr, owner, repo }: { pr: PullRequestDetail; owner: string; repo: string }) {
  const tone = stateTone(pr);
  const label = stateLabel(pr);

  return (
    <div className="flex flex-col gap-4">
      {/* Header card */}
      <Panel>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-base font-medium text-fg">{pr.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs text-faint">
                <span>{owner}/{repo}</span>
                <span>#{pr.number}</span>
                {pr.author && <span>by {pr.author.login}</span>}
                {pr.createdAt && <span>opened {relativeTime(pr.createdAt)}</span>}
                {pr.updatedAt && <span>· updated {relativeTime(pr.updatedAt)}</span>}
              </div>
            </div>
            <Badge tone={tone} className="shrink-0">
              {label}
            </Badge>
          </div>

          {/* Branch */}
          {(pr.headRefName || pr.baseRefName) && (
            <div className="font-mono text-xs text-muted">
              <span className="text-faint">branch: </span>
              <span>{pr.headRefName ?? '?'}</span>
              {pr.baseRefName && (
                <>
                  <span className="text-faint"> → </span>
                  <span>{pr.baseRefName}</span>
                </>
              )}
            </div>
          )}

          {/* Labels */}
          {pr.labels && pr.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pr.labels.map((l) => (
                <span
                  key={l.name}
                  className="rounded border px-1.5 py-0.5 font-mono text-2xs"
                  style={{ borderColor: `#${l.color}40`, color: `#${l.color}`, background: `#${l.color}18` }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          {(pr.additions != null || pr.deletions != null || pr.changedFiles != null) && (
            <div className="flex gap-4 font-mono text-xs">
              {pr.changedFiles != null && (
                <span className="text-muted">{pr.changedFiles} file{pr.changedFiles !== 1 ? 's' : ''}</span>
              )}
              {pr.additions != null && (
                <span className="text-ok">+{pr.additions}</span>
              )}
              {pr.deletions != null && (
                <span className="text-danger">−{pr.deletions}</span>
              )}
            </div>
          )}

          {/* External link — plain <a> so OS/GitHub app handles it, no window.open */}
          {pr.url && (
            <div>
              <a
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent underline-offset-2 hover:underline"
              >
                View on GitHub ↗
              </a>
            </div>
          )}
        </div>
      </Panel>

      {/* Body */}
      <Panel>
        <PanelHeader title="Description" />
        <PanelBody>
          <MarkdownBody text={pr.body} />
        </PanelBody>
      </Panel>

      <FilesSection files={pr.files} />
      <ChecksSection checks={pr.checks} />
      <ReviewsSection reviews={pr.reviews} />
      <CommentsSection comments={pr.comments} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Routed page
// ---------------------------------------------------------------------------

export interface PrDetailParams {
  owner: string;
  repo: string;
  prNumber: string;
}

/**
 * Full-page routed PR detail view.
 * URL: /prs/$owner/$repo/$prNumber — deep-linkable, back returns to /prs.
 */
export function PullRequestDetailPage() {
  const params = useParams({ strict: false }) as PrDetailParams;
  const navigate = useNavigate();
  const { owner, repo, prNumber } = params;
  const number = parseInt(prNumber, 10);

  const { data, isLoading, isError, error, refetch } = usePullRequestDetail(owner, repo, number);

  const back = () => void navigate({ to: '/landing', search: { state: 'open' } });

  const title = data ? `#${data.number} ${data.title}` : `PR #${prNumber}`;
  const description = data ? `${owner}/${repo}` : `${owner}/${repo}`;

  return (
    <Surface
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={back}>
            ← Back
          </Button>
        </div>
      }
    >
      {isLoading && (
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
          <Spinner />
          Loading pull request…
        </Panel>
      )}

      {isError && (
        <Panel className="py-16 text-center text-sm">
          <p className="text-danger">{error instanceof Error ? error.message : 'Failed to load PR'}</p>
          <p className="mt-2 text-xs text-faint">
            Make sure <code className="font-mono">GITHUB_TOKEN</code> is set in the server environment.
          </p>
          <Button variant="ghost" size="sm" onClick={() => void refetch()} className="mt-4">
            Retry
          </Button>
        </Panel>
      )}

      {data && <PrDetail pr={data} owner={owner} repo={repo} />}
    </Surface>
  );
}
