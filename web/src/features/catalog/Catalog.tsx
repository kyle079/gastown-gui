import { useNavigate, useSearch } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { cn } from '@/lib/utils/cn';
import { IssuesView } from './IssuesView';
import { FormulasView } from './FormulasView';

export type CatalogTab = 'issues' | 'formulas';

export function isCatalogTab(value: unknown): value is CatalogTab {
  return value === 'issues' || value === 'formulas';
}

export interface CatalogSearch {
  tab: CatalogTab;
  /** Selected issue ID (issues tab only). Lives in URL so it deep-links. */
  id?: string;
  /** Issues status filter. */
  status?: string;
  /** Issues search query. */
  q?: string;
}

export function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  return {
    tab: isCatalogTab(search.tab) ? search.tab : 'issues',
    id: typeof search.id === 'string' ? search.id : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
    q: typeof search.q === 'string' ? search.q : undefined,
  };
}

const TABS: { id: CatalogTab; label: string; description: string }[] = [
  {
    id: 'issues',
    label: 'Issues',
    description: 'Beads tracked in this town — bugs, tasks, and features. Filter, then drill in.',
  },
  {
    id: 'formulas',
    label: 'Formulas',
    description: 'Workflow and convoy templates available to dispatch against a target.',
  },
];

/**
 * One surface, one job: browse the town's work artifacts. A segmented control
 * switches between three focused lists — issues, pull requests, formulas — each
 * doing exactly one thing well. The active tab lives in the URL (`?tab=`) so it
 * deep-links and the command palette can jump straight to a view. Issue detail
 * is tracked in `?id=` so it too is deep-linkable.
 */
export function Catalog() {
  const search = useSearch({ strict: false }) as CatalogSearch;
  const navigate = useNavigate();
  const tab: CatalogTab = isCatalogTab(search.tab) ? search.tab : 'issues';
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  const setTab = (id: CatalogTab) =>
    void navigate({ to: '/catalog', search: { tab: id } });

  return (
    <Surface title="Catalog" description={active.description}>
      <div className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Catalog views"
          className="inline-flex w-full gap-0.5 rounded-md border border-line bg-surface p-0.5 sm:w-auto"
        >
          {TABS.map((t) => {
            const isActive = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.id)}
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

        {tab === 'issues' && <IssuesView />}
        {tab === 'formulas' && <FormulasView />}
      </div>
    </Surface>
  );
}
