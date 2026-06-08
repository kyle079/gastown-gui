import { useState } from 'react';
import { Surface } from '@/components/Surface';
import { Button, Panel, Spinner } from '@/components/primitives';
import { cn } from '@/lib/utils/cn';
import { useStatus } from '@/lib/query/hooks';
import type { Agent } from '@/lib/api/types';
import { AttentionInboxPanel } from './AttentionInboxPanel';
import { AskMayorPanel } from './AskMayorPanel';
import { ActivityContextPanel } from './ActivityContextPanel';
import { DispatchCommandCenter } from './DispatchCommandCenter';
import { ReviewQueuePanel } from './ReviewQueuePanel';
import { FormulaExplorerPanel } from './FormulaExplorerPanel';
import { AgentDetailDialog } from './AgentDetailDialog';

type OpsTab = 'inbox' | 'dispatch' | 'review' | 'formulas';

const TAB_META: Record<OpsTab, { label: string; description: string }> = {
  inbox: {
    label: 'Attention',
    description: 'Actionable operator inbox: severity-ranked attention plus recent hook and bead context.',
  },
  dispatch: {
    label: 'Dispatch',
    description: 'Search work, preview dependencies, choose targets, and sling with formula context.',
  },
  review: {
    label: 'Review',
    description: 'Ready work, active hooks, and per-rig merge queue / refinery state in one pass.',
  },
  formulas: {
    label: 'Formulas',
    description: 'Explore workflow structure and step previews before dispatch or operational changes.',
  },
};

export function OpsSurface() {
  const { data: status, isLoading, isError, error, refetch } = useStatus();
  const [tab, setTab] = useState<OpsTab>('inbox');
  const [selectedFormula, setSelectedFormula] = useState('mol-polecat-work');
  const [formulaArgs, setFormulaArgs] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  if (isLoading) {
    return (
      <Surface title="Operator">
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
          <Spinner />
          Loading operator surface…
        </Panel>
      </Surface>
    );
  }

  if (isError || !status) {
    return (
      <Surface title="Operator">
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
    <Surface title="Operator" description={TAB_META[tab].description}>
      <div className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Operator views"
          className="inline-flex w-full gap-0.5 rounded-md border border-line bg-surface p-0.5 sm:w-auto"
        >
          {(Object.keys(TAB_META) as OpsTab[]).map((value) => (
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
              {TAB_META[value].label}
            </button>
          ))}
        </div>

        {tab === 'inbox' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <AttentionInboxPanel status={status} onSelectAgent={setSelectedAgent} />
            <ActivityContextPanel />
          </div>
        )}

        {tab === 'dispatch' && (
          <div className="flex flex-col gap-4">
            <AskMayorPanel selectedFormula={selectedFormula} formulaArgs={formulaArgs} />
            <DispatchCommandCenter
              selectedFormula={selectedFormula}
              onSelectedFormula={setSelectedFormula}
              formulaArgs={formulaArgs}
              onFormulaArgs={setFormulaArgs}
            />
            <FormulaExplorerPanel
              selectedName={selectedFormula}
              onSelectName={setSelectedFormula}
            />
          </div>
        )}

        {tab === 'review' && (
          <ReviewQueuePanel status={status} onSelectAgent={setSelectedAgent} />
        )}

        {tab === 'formulas' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <FormulaExplorerPanel
              selectedName={selectedFormula}
              onSelectName={setSelectedFormula}
            />
            <ActivityContextPanel />
          </div>
        )}
      </div>

      <AgentDetailDialog
        agent={selectedAgent}
        open={selectedAgent != null}
        onClose={() => setSelectedAgent(null)}
      />
    </Surface>
  );
}
