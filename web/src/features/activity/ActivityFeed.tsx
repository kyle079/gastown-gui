import { useMemo, useState } from 'react';
import { Surface } from '@/components/Surface';
import {
  Panel,
  PanelHeader,
  Input,
  StatusDot,
  StatusPill,
  Spinner,
  Button,
  ListRow,
} from '@/components/primitives';
import { useActivity } from '@/lib/query/hooks';
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

type Filter = ActivityCategory | 'all';

// System events are rare and uncategorised; they still appear under "All" but
// don't earn their own chip — keeping the filter row to the signal categories.
const CHIP_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'system');

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
      description="The live town event stream — work, mail, escalations, sessions."
      actions={liveIndicator}
    >
      <div className="flex flex-col gap-3">
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
            <div className="divide-hairline">
              {filtered.map((v) => (
                <ActivityRow key={v.id} view={v} />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </Surface>
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
        // Roomier tap target on touch; dense on desktop.
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

// Idle chip dots carry their category color (muted by the dot's own opacity-free
// fill); the active chip uses the accent so selection reads clearly.
const toneDotClass: Record<ActivityCategory, string> = {
  escalation: 'bg-danger',
  work: 'bg-accent',
  comms: 'bg-info',
  session: 'bg-faint',
  system: 'bg-faint',
};

function ActivityRow({ view }: { view: ActivityView }) {
  return (
    <ListRow
      leading={<StatusDot tone={view.tone} />}
      title={
        <span className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-xs text-muted">{view.actor}</span>
          <span className="shrink-0 text-fg">{view.label}</span>
          {view.target && (
            <span className="truncate font-mono text-xs text-accent">{view.target}</span>
          )}
        </span>
      }
      subtitle={view.detail}
      trailing={
        <span className="font-mono text-2xs text-faint" title={view.ts ?? undefined}>
          {relativeTime(view.ts)}
        </span>
      }
    />
  );
}
