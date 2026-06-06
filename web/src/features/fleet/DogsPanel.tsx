import { Panel, PanelHeader, ListRow, StatusDot, StatusPill } from '@/components/primitives';
import { useDogs } from '@/lib/query/hooks';
import type { Dog } from '@/lib/api/types';

function dogTone(state: Dog['state']): 'ok' | 'warn' | 'neutral' {
  if (state === 'working') return 'ok';
  if (state === 'idle') return 'neutral';
  return 'warn';
}

/** The Pack — cross-rig infrastructure workers from `gt dog list --json`. */
export function DogsPanel() {
  const { data, isLoading, isError } = useDogs();

  if (isLoading) {
    return (
      <Panel flush>
        <PanelHeader title="Pack" hint="loading…" />
        <div className="px-4 py-6 text-sm text-muted">Fetching pack status…</div>
      </Panel>
    );
  }

  if (isError || !data) {
    return (
      <Panel flush>
        <PanelHeader title="Pack" />
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
          <StatusDot tone="warn" />
          Pack unavailable
        </div>
      </Panel>
    );
  }

  const { dogs, summary } = data;
  const hint = summary
    ? `${summary.working} working / ${summary.idle} idle`
    : `${dogs.length} dogs`;

  return (
    <Panel flush>
      <PanelHeader title="Pack" hint={hint} />
      {dogs.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-6 text-sm text-muted">
          <StatusDot tone="neutral" />
          No dogs registered.
        </div>
      ) : (
        <div className="divide-hairline">
          {dogs.map((dog) => {
            const tone = dogTone(dog.state);
            const wtCount = dog.worktrees ? Object.keys(dog.worktrees).length : 0;
            return (
              <ListRow
                key={dog.name}
                leading={<StatusDot tone={tone} pulse={dog.state === 'working'} />}
                title={<span className="font-mono text-sm">{dog.name}</span>}
                subtitle={wtCount > 0 ? `${wtCount} worktree${wtCount !== 1 ? 's' : ''}` : undefined}
                trailing={
                  <StatusPill
                    tone={tone}
                    pulse={dog.state === 'working'}
                    label={dog.state}
                  />
                }
              />
            );
          })}
        </div>
      )}
    </Panel>
  );
}
