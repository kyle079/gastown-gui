import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  useToast,
} from '@/components/primitives';
import { ApiError } from '@/lib/api/client';
import { useBeadDetail, useBeadSearch, useSling, useTargets } from '@/lib/query/hooks';
import { priorityLabel, priorityTone, statusLabel, statusTone } from '@/features/catalog/catalogMeta';
import { compactAddress, rankTargets } from './opsModel';

export function DispatchCommandCenter({
  selectedFormula,
  onSelectedFormula,
}: {
  selectedFormula: string;
  onSelectedFormula: (name: string) => void;
}) {
  const { notify } = useToast();
  const { data: targets } = useTargets();
  const sling = useSling();
  const [query, setQuery] = useState('');
  const [beadId, setBeadId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBeadId, setSelectedBeadId] = useState('');
  const [target, setTarget] = useState('');
  const [formulaArgs, setFormulaArgs] = useState('');

  const { data: searchResults } = useBeadSearch(query);
  const { data: bead } = useBeadDetail(selectedBeadId || beadId.trim());
  const sortedTargets = useMemo(() => rankTargets(targets ?? []), [targets]);
  const suggestions = sortedTargets.slice(0, 5);
  const resolvedTitle = title.trim();

  useEffect(() => {
    if (!selectedBeadId || beadId.trim()) return;
    setBeadId(selectedBeadId);
    setTitle('');
    setDescription('');
  }, [selectedBeadId, beadId]);

  const error =
    sling.error instanceof ApiError
      ? sling.error.message
      : sling.error
        ? 'Dispatch failed'
        : null;

  function submit() {
    const id = beadId.trim();
    if (!id && !resolvedTitle) return;

    const payload = {
      target: target || undefined,
      molecule: selectedFormula || undefined,
      args: formulaArgs.trim() || undefined,
      ...(id
        ? { bead: id }
        : {
            title: resolvedTitle,
            ...(description.trim() ? { description: description.trim() } : {}),
          }),
    };

    sling.mutate(payload, {
      onSuccess: (data) => {
        const resolved = data?.data?.bead || id || resolvedTitle;
        notify(`Dispatched ${resolved}${target ? ` → ${target}` : ''}`, 'accent');
        setQuery('');
        setBeadId('');
        setSelectedBeadId('');
        setTitle('');
        setDescription('');
        setFormulaArgs('');
        setTarget('');
      },
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Panel flush>
        <PanelHeader title="Dispatch Command Center" hint="search + target + workflow" />
        <PanelBody className="flex flex-col gap-3 border-b border-line">
          <Input
            type="search"
            placeholder="Search bead id, title, or type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Input
            placeholder="Selected bead id"
            className="font-mono"
            value={beadId}
            onChange={(e) => {
              const next = e.target.value;
              setBeadId(next);
              if (next.trim()) {
                setSelectedBeadId('');
                setTitle('');
                setDescription('');
              }
            }}
          />
        </PanelBody>

        {(searchResults ?? []).length === 0 ? (
          <div className="px-4 py-6 text-sm text-faint">
            {query.trim().length > 1 ? 'No beads match this query.' : 'Type at least two characters to search.'}
          </div>
        ) : (
          <div className="divide-hairline">
            {(searchResults ?? []).slice(0, 8).map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => {
                  setSelectedBeadId(result.id);
                  setBeadId(result.id);
                }}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  selectedBeadId === result.id ? 'bg-raised' : 'hover:bg-raised'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-fg">{result.id}</div>
                    <div className="mt-0.5 truncate text-sm text-muted">{result.title}</div>
                  </div>
                  <Badge tone={statusTone(result.status)}>{statusLabel(result.status)}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="text-sm font-medium text-fg">Dispatch Preview</h2>
            <p className="mt-1 text-sm text-muted">Dependency context, target suggestions, and formula options before sling.</p>
          </div>
          <Button size="sm" variant="primary" disabled={(!beadId.trim() && !resolvedTitle) || sling.isPending} onClick={submit}>
            {sling.isPending ? 'Dispatching…' : 'Dispatch'}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-faint">Target</span>
            <Select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Auto (let gt choose)</option>
              {sortedTargets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-faint">Formula / Molecule</span>
            <Input
              value={selectedFormula}
              onChange={(e) => onSelectedFormula(e.target.value)}
              className="font-mono"
              placeholder="mol-polecat-work"
            />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-wider text-faint">Args</span>
          <Input
            value={formulaArgs}
            onChange={(e) => setFormulaArgs(e.target.value)}
            className="font-mono"
            placeholder="base_branch=master"
          />
        </label>

        {!beadId.trim() && (
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-faint">Title (create new bead)</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-mono"
              placeholder="A descriptive title"
            />
          </label>
        )}

        {!beadId.trim() && (
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-faint">Description (optional)</span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="font-mono"
              placeholder="Optional details"
            />
          </label>
        )}

        {suggestions.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 font-mono text-2xs uppercase tracking-wider text-faint">Suggested Targets</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <Button key={item.id} size="sm" variant="ghost" onClick={() => setTarget(item.id)}>
                  {compactAddress(item.name)}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-md border border-line bg-surface-alt p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-xs text-fg">{bead?.id || beadId || title || 'No bead selected'}</div>
              <div className="mt-1 text-sm text-muted">
                {bead?.title || resolvedTitle || 'Select a bead or create a title to preview dispatch context.'}
              </div>
            </div>
            {bead && (
              <div className="flex items-center gap-2">
                <Badge tone={priorityTone(bead.priority)}>{priorityLabel(bead.priority)}</Badge>
                <Badge tone={statusTone(bead.status)}>{statusLabel(bead.status)}</Badge>
              </div>
            )}
          </div>

          {bead?.description && (
            <div className="mt-3 whitespace-pre-wrap text-xs text-muted">
              {bead.description.slice(0, 420)}
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 font-mono text-2xs uppercase tracking-wider text-faint">Dependency Preview</div>
            {!bead?.dependencies || bead.dependencies.length === 0 ? (
              <div className="text-sm text-faint">No dependencies recorded.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {bead.dependencies.slice(0, 6).map((dependency) => (
                  <div key={dependency.id} className="rounded border border-line bg-surface px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-fg">{dependency.id}</div>
                        <div className="truncate text-sm text-muted">{dependency.title}</div>
                      </div>
                      <Badge tone={statusTone(dependency.status)}>{statusLabel(dependency.status)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="mt-3 font-mono text-xs text-danger">{error}</div>}
        </div>
      </Panel>
    </div>
  );
}
