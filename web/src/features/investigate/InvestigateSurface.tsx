import { useSearch, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils/cn';
import { ActivityFeed } from '@/features/activity/ActivityFeed';
import { IssuesView } from '@/features/catalog/IssuesView';
import { FormulasView } from '@/features/catalog/FormulasView';
import { BeadGraph } from '@/features/graph/BeadGraph';

export type InvestigateMode = 'timeline' | 'issues' | 'formulas' | 'graph';

export interface InvestigateSearch {
  mode?: InvestigateMode;
}

export function validateInvestigateSearch(search: Record<string, unknown>): InvestigateSearch {
  const valid: InvestigateMode[] = ['timeline', 'issues', 'formulas', 'graph'];
  const mode = valid.includes(search.mode as InvestigateMode)
    ? (search.mode as InvestigateMode)
    : undefined;
  return { mode };
}

const TABS: { mode: InvestigateMode; label: string; description: string }[] = [
  { mode: 'timeline', label: 'Timeline', description: 'Live activity stream and changelog' },
  { mode: 'issues', label: 'Issues', description: 'Browse and search beads' },
  { mode: 'formulas', label: 'Formulas', description: 'Explore workflow templates' },
  { mode: 'graph', label: 'Graph', description: 'Bead dependency visualization' },
];

export function InvestigateSurface() {
  const navigate = useNavigate();
  const { mode = 'timeline' } = useSearch({ strict: false }) as InvestigateSearch;

  const setMode = (m: InvestigateMode) => {
    void navigate({ to: '/investigate', search: { mode: m } });
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-line bg-base px-6 py-2">
        <div
          role="tablist"
          aria-label="Investigate modes"
          className="inline-flex gap-0.5 rounded-md border border-line bg-surface p-0.5"
        >
          {TABS.map((tab) => {
            const active = mode === tab.mode;
            return (
              <button
                key={tab.mode}
                role="tab"
                aria-selected={active}
                aria-label={tab.description}
                onClick={() => setMode(tab.mode)}
                className={cn(
                  'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-raised text-fg shadow-sm'
                    : 'text-muted hover:bg-raised/60 hover:text-fg',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'timeline' && <ActivityFeed />}
      {mode === 'issues' && <IssuesView />}
      {mode === 'formulas' && <FormulasView />}
      {mode === 'graph' && <BeadGraph />}
    </div>
  );
}
