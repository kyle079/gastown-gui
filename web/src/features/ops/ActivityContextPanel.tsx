import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Panel, PanelHeader, StatusDot } from '@/components/primitives';
import { useTrail } from '@/lib/query/hooks';
import type { TrailBeadItem, TrailHookItem } from '@/lib/api/types';

type ActivityTab = 'hooks' | 'beads';

export function ActivityContextPanel() {
  const [tab, setTab] = useState<ActivityTab>('hooks');
  const { data: hookData } = useTrail({ type: 'hooks', limit: 12 });
  const { data: beadData } = useTrail({ type: 'beads', limit: 12 });
  const hooks = (hookData ?? []) as TrailHookItem[];
  const beads = (beadData ?? []) as TrailBeadItem[];

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Operator activity views"
        className="inline-flex w-full gap-0.5 rounded-md border border-line bg-surface p-0.5 sm:w-auto"
      >
        {(['hooks', 'beads'] as ActivityTab[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'flex-1 rounded px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:py-1.5',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              tab === value ? 'bg-raised text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {value === 'hooks' ? 'Hook Timeline' : 'Bead Trail'}
          </button>
        ))}
      </div>

      <Panel flush>
        <PanelHeader
          title={tab === 'hooks' ? 'Recent Hook Events' : 'Recent Bead Updates'}
          hint={String(tab === 'hooks' ? hooks.length : beads.length)}
        />
        {tab === 'hooks' && (
          hooks.length === 0 ? (
            <div className="px-4 py-6 text-sm text-faint">No hook history available.</div>
          ) : (
            <div className="divide-hairline">
              {hooks.map((item) => (
                <div key={`${item.actor}:${item.timestamp}:${item.bead ?? 'none'}`} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs text-fg">{item.actor}</div>
                      <div className="mt-0.5 text-sm text-muted">
                        {item.type}
                        {item.bead ? ` · ${item.bead}` : ''}
                      </div>
                    </div>
                    <div className="font-mono text-2xs text-faint">{item.time_relative || item.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'beads' && (
          beads.length === 0 ? (
            <div className="px-4 py-6 text-sm text-faint">No bead trail available.</div>
          ) : (
            <div className="divide-hairline">
              {beads.map((item) => (
                <div key={item.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-fg">{item.id}</div>
                      <div className="truncate text-sm text-muted">{item.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusDot tone={item.status === 'blocked' ? 'warn' : item.status === 'closed' ? 'ok' : 'accent'} />
                      <span className="font-mono text-2xs text-faint">{item.updated_at || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </Panel>
    </div>
  );
}
