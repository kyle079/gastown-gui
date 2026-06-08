import { useState } from 'react';
import { Button, Input, Panel, PanelBody, PanelHeader, Select, Textarea, useToast } from '@/components/primitives';
import { Surface } from '@/components/Surface';
import { ApiError } from '@/lib/api/client';
import { useCreateBead, useMayorRequest, useTargets } from '@/lib/query/hooks';
import { rankTargets } from '@/features/ops/opsModel';
import { AskMayorPanel } from '@/features/ops/AskMayorPanel';
import { DispatchCommandCenter } from '@/features/ops/DispatchCommandCenter';
import { FormulaExplorerPanel } from '@/features/ops/FormulaExplorerPanel';
import { WorkSurface } from '@/features/work/WorkSurface';
import { cn } from '@/lib/utils/cn';

type DispatchTab = 'dispatch' | 'create' | 'track';

const TAB_META: Record<DispatchTab, { label: string; description: string }> = {
  dispatch: {
    label: 'Dispatch',
    description: 'Search existing work, preview dependencies, choose a target, and sling with formula context.',
  },
  create: {
    label: 'New work',
    description: 'File a new issue and immediately dispatch it to an agent.',
  },
  track: {
    label: 'Track',
    description: 'Convoy board, bead queue, and next-action summary.',
  },
};

const PRIORITY_OPTIONS = [
  { value: '', label: 'Default (P2)' },
  { value: '0', label: 'P0 — Urgent' },
  { value: '1', label: 'P1 — High' },
  { value: '2', label: 'P2 — Normal' },
  { value: '3', label: 'P3 — Low' },
  { value: '4', label: 'P4 — Backlog' },
];

function NewWorkPanel() {
  const { notify } = useToast();
  const { data: targets } = useTargets();
  const createBead = useCreateBead();
  const mayorRequest = useMayorRequest();

  const [mode, setMode] = useState<'file' | 'file-and-dispatch'>('file-and-dispatch');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [labelsRaw, setLabelsRaw] = useState('');
  const [target, setTarget] = useState('');

  const sortedTargets = rankTargets(targets ?? []);
  const isPending = createBead.isPending || mayorRequest.isPending;
  const canSubmit = title.trim().length > 0 && !isPending;

  const error =
    createBead.error instanceof ApiError
      ? createBead.error.message
      : createBead.error
        ? 'Failed to create bead'
        : mayorRequest.error instanceof ApiError
          ? mayorRequest.error.message
          : mayorRequest.error
            ? 'Failed to dispatch'
            : null;

  function reset() {
    setTitle('');
    setDescription('');
    setPriority('');
    setLabelsRaw('');
    setTarget('');
    createBead.reset();
    mayorRequest.reset();
  }

  function submit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (mode === 'file') {
      const labels = labelsRaw.split(',').map((l) => l.trim()).filter(Boolean);
      createBead.mutate(
        {
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority: priority !== '' ? Number(priority) : undefined,
          labels: labels.length > 0 ? labels : undefined,
        },
        {
          onSuccess: (result) => {
            notify(`Filed ${result.bead_id}`, 'ok');
            reset();
          },
        },
      );
    } else {
      const prompt = description.trim()
        ? `${trimmedTitle}\n\n${description.trim()}`
        : trimmedTitle;
      mayorRequest.mutate(
        { prompt, target: target || undefined },
        {
          onSuccess: (result) => {
            notify(
              result.status === 'ok'
                ? `Dispatched ${result.summary.dispatched} item${result.summary.dispatched === 1 ? '' : 's'}`
                : 'Created with follow-up needed',
              result.status === 'ok' ? 'ok' : 'warn',
            );
            reset();
          },
        },
      );
    }
  }

  return (
    <div className="max-w-xl">
      <Panel>
        <PanelHeader title="New work" hint="file or file & dispatch" />
        <PanelBody>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => { e.preventDefault(); submit(); }}
          >
            <div className="flex gap-1 rounded-md border border-line bg-surface-alt p-1">
              <button
                type="button"
                onClick={() => setMode('file')}
                className={cn(
                  'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                  mode === 'file' ? 'bg-overlay text-fg shadow-sm' : 'text-muted hover:text-fg',
                )}
              >
                File it
              </button>
              <button
                type="button"
                onClick={() => setMode('file-and-dispatch')}
                className={cn(
                  'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                  mode === 'file-and-dispatch' ? 'bg-overlay text-fg shadow-sm' : 'text-muted hover:text-fg',
                )}
              >
                File &amp; dispatch
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Title</span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs doing?"
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Description</span>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Optional context, acceptance criteria, or notes."
              />
            </label>

            {mode === 'file' && (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted">Priority</span>
                  <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted">Labels</span>
                  <Input
                    value={labelsRaw}
                    onChange={(e) => setLabelsRaw(e.target.value)}
                    placeholder="bug, frontend"
                  />
                </label>
              </div>
            )}

            {mode === 'file-and-dispatch' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Target (optional)</span>
                <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Auto (let gt choose)</option>
                  {sortedTargets.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </label>
            )}

            {error && <p className="font-mono text-xs text-danger">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" type="button" onClick={reset} disabled={isPending}>
                Reset
              </Button>
              <Button size="sm" variant="primary" type="submit" disabled={!canSubmit}>
                {isPending
                  ? mode === 'file' ? 'Filing…' : 'Dispatching…'
                  : mode === 'file' ? 'File it' : 'File & dispatch'}
              </Button>
            </div>
          </form>
        </PanelBody>
      </Panel>
    </div>
  );
}

export function DispatchSurface() {
  const [tab, setTab] = useState<DispatchTab>('dispatch');
  const [selectedFormula, setSelectedFormula] = useState('mol-polecat-work');
  const [formulaArgs, setFormulaArgs] = useState('');

  return (
    <Surface title="Dispatch" description={TAB_META[tab].description}>
      <div className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Dispatch modes"
          className="inline-flex w-full gap-0.5 rounded-md border border-line bg-surface p-0.5 sm:w-auto"
        >
          {(Object.keys(TAB_META) as DispatchTab[]).map((value) => (
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

        {tab === 'dispatch' && (
          <div className="flex flex-col gap-4">
            <AskMayorPanel
              selectedFormula={selectedFormula}
              onSelectedFormula={setSelectedFormula}
              formulaArgs={formulaArgs}
              onFormulaArgs={setFormulaArgs}
            />
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

        {tab === 'create' && <NewWorkPanel />}

        {tab === 'track' && <WorkSurface />}
      </div>
    </Surface>
  );
}
