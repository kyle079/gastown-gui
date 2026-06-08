import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import {
  Panel,
  PanelHeader,
  Input,
  StatusDot,
  StatusPill,
  Spinner,
  Button,
  Badge,
  useToast,
} from '@/components/primitives';
import { useActivity, useChangelog, useSendNudge, useSendMail } from '@/lib/query/hooks';
import type { ChangelogEntry } from '@/lib/api/types';
import { useActivityStream } from '@/lib/realtime/useActivityStream';
import { relativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import {
  CATEGORIES,
  toActivityView,
  matchesQuery,
  type ActivityCategory,
  type ActivityView,
} from './activityModel';

type ActivityTab = 'feed' | 'changelog';

type Filter = ActivityCategory | 'all';

const CHIP_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'system');

/** Derive a bead id from a branch name, e.g. "polecat/chrome/gg-2q5@session" → "gg-2q5". */
function beadFromBranch(branch?: string): string | undefined {
  if (!branch) return undefined;
  const last = branch.split('/').pop();
  if (!last) return undefined;
  const id = last.includes('@') ? last.slice(0, last.indexOf('@')) : last;
  return /^[a-z]+-[a-z0-9]+$/.test(id) ? id : undefined;
}

/** Render a payload value as a routed link where the shape is recognisable. */
function PayloadLink({ label, value }: { label: string; value: string }) {
  // Bead IDs look like "gg-abc" or "hq-cv-xyz"
  const isBead = /^[a-z]+-[a-z0-9]+$/.test(value);
  // Branch names contain a slash or "@" — extract bead id
  const beadFromBr = label === 'branch' ? beadFromBranch(value) : undefined;
  // Rig names are hyphen/underscore separated identifiers without slashes
  const isRig = !value.includes('/') && !value.includes('@') && value.includes('_');

  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="w-24 shrink-0 font-mono text-2xs uppercase tracking-wider text-faint">
        {label}
      </span>
      <span className="min-w-0 break-all font-mono text-fg">
        {isBead && label !== 'branch' ? (
          <Link
            to="/issues"
            search={{ id: value }}
            className="text-accent underline-offset-2 hover:underline"
          >
            {value}
          </Link>
        ) : beadFromBr ? (
          <>
            {value}{' '}
            <Link
              to="/issues"
              search={{ id: beadFromBr }}
              className="text-accent underline-offset-2 hover:underline"
            >
              ({beadFromBr})
            </Link>
          </>
        ) : isRig ? (
          <Link
            to="/rigs/$rig"
            params={{ rig: value }}
            className="text-accent underline-offset-2 hover:underline"
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

type FeedMsgMode = 'nudge' | 'mail';

/** Expanded detail for an activity event — full content, no truncation. */
function ActivityExpanded({ view }: { view: ActivityView }) {
  const ts = view.ts ? new Date(view.ts).toLocaleString() : null;
  const [msgMode, setMsgMode] = useState<FeedMsgMode>('nudge');
  const [msgText, setMsgText] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const sendNudge = useSendNudge();
  const sendMail = useSendMail();
  const { notify } = useToast();

  // Collect meaningful payload fields (strings/numbers, non-empty)
  const fields = Object.entries(view.payload).filter(([, v]) => {
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return true;
    return false;
  }) as [string, string | number][];

  function handleSend() {
    if (!msgText.trim()) return;
    if (msgMode === 'nudge') {
      sendNudge.mutate(
        { target: view.actor, message: msgText.trim() },
        {
          onSuccess: () => { notify(`Nudged ${view.actor}`, 'ok'); setMsgText(''); },
          onError: (err) => notify(err instanceof Error ? err.message : 'Nudge failed', 'danger'),
        },
      );
    } else {
      if (!mailSubject.trim()) return;
      sendMail.mutate(
        { to: view.actor, subject: mailSubject.trim(), message: msgText.trim() },
        {
          onSuccess: () => { notify(`Sent mail to ${view.actor}`, 'ok'); setMsgText(''); setMailSubject(''); },
          onError: (err) => notify(err instanceof Error ? err.message : 'Mail failed', 'danger'),
        },
      );
    }
  }

  function switchMode(mode: FeedMsgMode) {
    setMsgMode(mode);
    setMsgText('');
    setMailSubject(mode === 'mail' ? `Operator: re ${view.eventType}` : '');
  }

  return (
    <div className="border-t border-line/60 bg-raised/40 px-4 py-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="w-24 shrink-0 font-mono text-2xs uppercase tracking-wider text-faint">
            type
          </span>
          <span className="font-mono text-muted">{view.eventType}</span>
        </div>
        <div className="flex items-baseline gap-2 text-xs">
          <span className="w-24 shrink-0 font-mono text-2xs uppercase tracking-wider text-faint">
            actor
          </span>
          <span className="font-mono text-fg">{view.actor}</span>
        </div>
        {ts && (
          <div className="flex items-baseline gap-2 text-xs">
            <span className="w-24 shrink-0 font-mono text-2xs uppercase tracking-wider text-faint">
              time
            </span>
            <span className="font-mono text-fg">{ts}</span>
          </div>
        )}
        {fields.map(([k, v]) => (
          <PayloadLink key={k} label={k} value={String(v)} />
        ))}
      </div>

      {/* Inline reply to actor */}
      <div className="mt-3 border-t border-line/40 pt-3">
        <div className="flex items-center gap-1.5 pb-1.5">
          <span className="font-mono text-2xs uppercase tracking-wider text-faint">Reply</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => switchMode('nudge')}
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-2xs transition-colors',
                msgMode === 'nudge' ? 'bg-surface-alt text-fg' : 'text-faint hover:text-muted',
              )}
            >
              nudge
            </button>
            <button
              type="button"
              onClick={() => switchMode('mail')}
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-2xs transition-colors',
                msgMode === 'mail' ? 'bg-surface-alt text-fg' : 'text-faint hover:text-muted',
              )}
            >
              mail
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {msgMode === 'mail' && (
            <Input
              value={mailSubject}
              onChange={(e) => setMailSubject(e.target.value)}
              placeholder="Subject"
              className="text-xs"
            />
          )}
          <div className="flex gap-2">
            <Input
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder={msgMode === 'nudge' ? `Nudge ${view.actor}…` : 'Message body…'}
              className="flex-1 text-xs"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <Button
              size="sm"
              variant="primary"
              disabled={!msgText.trim() || (msgMode === 'mail' && !mailSubject.trim()) || sendNudge.isPending || sendMail.isPending}
              onClick={handleSend}
            >
              {sendNudge.isPending || sendMail.isPending ? '…' : msgMode === 'nudge' ? 'Nudge' : 'Mail'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Activity — the live town event stream. One job: scan what's happening and
 * filter to what matters. Polled from `/api/activity`; the WebSocket nudges it
 * to refetch in real time. Signal over noise: escalations lead the filter row,
 * session churn (the noisy majority) sits last.
 */
export function ActivityFeed() {
  const { data, isLoading, isError, error, refetch } = useActivity();
  const { live } = useActivityStream();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<ActivityTab>('feed');

  const views = useMemo<ActivityView[]>(
    () => (data?.items ?? []).map(toActivityView),
    [data],
  );

  const counts = useMemo(() => {
    const c: Partial<Record<ActivityCategory, number>> = {};
    for (const v of views) c[v.category] = (c[v.category] ?? 0) + 1;
    return c;
  }, [views]);

  const filtered = useMemo(
    () =>
      views.filter(
        (v) => (filter === 'all' || v.category === filter) && matchesQuery(v, query),
      ),
    [views, filter, query],
  );

  const liveIndicator = (
    <StatusPill
      tone={live ? 'ok' : 'neutral'}
      pulse={live}
      label={live ? 'live' : 'offline'}
    />
  );

  if (isLoading) {
    return (
      <Surface title="Activity" actions={liveIndicator}>
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
          <Spinner />
          Loading activity…
        </Panel>
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface title="Activity" actions={liveIndicator}>
        <Panel className="flex flex-col items-center gap-4 py-16 text-center">
          <div>
            <p className="text-sm text-fg">Could not reach the gt bridge.</p>
            <p className="mt-1 font-mono text-xs text-faint">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </Panel>
      </Surface>
    );
  }

  return (
    <Surface
      title="Activity"
      description={tab === 'feed' ? 'The live town event stream — work, mail, escalations, sessions.' : 'Completed work from gt changelog.'}
      actions={liveIndicator}
    >
      <div className="flex flex-col gap-3">
        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Activity views"
          className="inline-flex w-full gap-0.5 rounded-md border border-line bg-surface p-0.5 sm:w-auto"
        >
          {(['feed', 'changelog'] as ActivityTab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 rounded px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:py-1.5',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                tab === t ? 'bg-raised text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {t === 'feed' ? 'Live Feed' : 'Changelog'}
            </button>
          ))}
        </div>

        {tab === 'changelog' && <ChangelogView />}

        {tab === 'feed' && <>
        {/* Filter row — category chips + search. Stacks on phones. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              label="All"
              count={views.length}
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            {CHIP_CATEGORIES.map((c) => (
              <FilterChip
                key={c.key}
                label={c.label}
                tone={c.key}
                count={counts[c.key] ?? 0}
                active={filter === c.key}
                onClick={() => setFilter(c.key)}
              />
            ))}
          </div>
          <div className="sm:w-64">
            <Input
              type="search"
              placeholder="Filter events…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter events"
            />
          </div>
        </div>

        <Panel flush>
          <PanelHeader
            title="Events"
            hint={
              filtered.length === views.length
                ? `${views.length}`
                : `${filtered.length} of ${views.length}`
            }
          />
          {filtered.length === 0 ? (
            <div className="flex items-center gap-2.5 px-4 py-10 text-sm text-muted">
              <StatusDot tone="neutral" />
              {views.length === 0 ? 'No activity yet.' : 'No events match this filter.'}
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {filtered.map((v) => (
                <ActivityRow key={v.id} view={v} />
              ))}
            </div>
          )}
        </Panel>
        </>}
      </div>
    </Surface>
  );
}

/** Completed work changelog from /api/changelog (gt changelog --json). */
function ChangelogView() {
  const { data, isLoading, isError, error, refetch } = useChangelog({ week: true });

  if (isLoading) {
    return (
      <Panel className="flex items-center gap-3 px-4 py-20 text-sm text-muted">
        <Spinner />
        Loading changelog…
      </Panel>
    );
  }

  if (isError || !data) {
    return (
      <Panel className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-fg">Could not load changelog.</p>
        <p className="font-mono text-xs text-faint">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <Button size="sm" variant="primary" onClick={() => void refetch()}>
          Retry
        </Button>
      </Panel>
    );
  }

  return (
    <Panel flush>
      <PanelHeader title="Completed Work" hint={String(data.length)} />
      {data.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-10 text-sm text-muted">
          <StatusDot tone="neutral" />
          No completed work this week.
        </div>
      ) : (
        <div className="divide-y divide-line/60">
          {data.map((entry) => (
            <ChangelogRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function ChangelogRow({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <div className="mt-0.5 shrink-0">
        <StatusDot tone="ok" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm text-fg">{entry.title}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          {entry.rig && (
            <span className="font-mono">{entry.rig}</span>
          )}
          {entry.type && (
            <Badge tone="neutral">{entry.type}</Badge>
          )}
          {entry.close_reason && entry.close_reason !== 'Closed' && (
            <span className="truncate text-faint">{entry.close_reason}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 font-mono text-2xs text-faint">
        {relativeTime(entry.closed_at)}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: ActivityCategory;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs transition-colors lg:py-1',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        active
          ? 'border-accent/60 bg-raised text-fg'
          : 'border-line text-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {tone && (
        <StatusDot tone={active ? 'accent' : 'neutral'} className={cn(!active && toneDotClass[tone])} />
      )}
      <span>{label}</span>
      <span className="font-mono text-2xs text-faint">{count}</span>
    </button>
  );
}

const toneDotClass: Record<ActivityCategory, string> = {
  escalation: 'bg-danger',
  work: 'bg-accent',
  comms: 'bg-info',
  session: 'bg-faint',
  system: 'bg-faint',
};

/** One activity event row — collapsed by default, expands inline on click. */
function ActivityRow({ view }: { view: ActivityView }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded((v) => !v);

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors',
          'hover:bg-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent',
          expanded && 'bg-raised/60',
        )}
      >
        <div className="mt-0.5 flex shrink-0 items-center">
          <StatusDot tone={view.tone} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono text-xs text-muted">{view.actor}</span>
            <span className="shrink-0 text-sm text-fg">{view.label}</span>
            {view.target && (
              <span className="truncate font-mono text-xs text-accent">{view.target}</span>
            )}
          </div>
          {view.detail && (
            <p className={cn('mt-0.5 text-xs text-muted', !expanded && 'line-clamp-1')}>
              {view.detail}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-2xs text-faint" title={view.ts ?? undefined}>
            {relativeTime(view.ts)}
          </span>
          <span className={cn('font-mono text-2xs text-faint transition-transform', expanded && 'rotate-180')}>
            ▾
          </span>
        </div>
      </button>

      {expanded && <ActivityExpanded view={view} />}
    </div>
  );
}
