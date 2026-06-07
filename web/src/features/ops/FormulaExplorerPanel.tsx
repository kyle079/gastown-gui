import { useMemo, useState } from 'react';
import { Badge, Input, Panel, PanelBody, PanelHeader } from '@/components/primitives';
import { useFormulaDetail, useFormulas } from '@/lib/query/hooks';
import type { Formula, FormulaStep } from '@/lib/api/types';

function filterFormulas(formulas: Formula[], query: string): Formula[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return formulas;
  return formulas.filter((formula) =>
    [formula.name, formula.description, formula.type].some((value) =>
      String(value ?? '').toLowerCase().includes(needle),
    ),
  );
}

export function FormulaExplorerPanel({
  selectedName,
  onSelectName,
}: {
  selectedName?: string;
  onSelectName?: (name: string) => void;
}) {
  const [localSelectedName, setLocalSelectedName] = useState<string>('');
  const [query, setQuery] = useState('');
  const { data: formulas } = useFormulas();

  const rows = useMemo(
    () => filterFormulas(formulas ?? [], query).sort((a, b) => a.name.localeCompare(b.name)),
    [formulas, query],
  );

  const activeName = selectedName || localSelectedName || rows[0]?.name || '';
  const { data: detail } = useFormulaDetail(activeName);
  const steps = (detail?.steps ?? []) as FormulaStep[];

  function setSelected(name: string) {
    if (onSelectName) onSelectName(name);
    else setLocalSelectedName(name);
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Panel flush>
        <PanelHeader title="Formula Explorer" hint={rows.length ? String(rows.length) : '0'} />
        <PanelBody className="border-b border-line">
          <Input
            type="search"
            placeholder="Filter formulas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </PanelBody>
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-faint">No formulas match this filter.</div>
        ) : (
          <div className="divide-hairline">
            {rows.slice(0, 12).map((formula) => (
              <button
                key={formula.name}
                type="button"
                onClick={() => setSelected(formula.name)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  activeName === formula.name ? 'bg-raised' : 'hover:bg-raised'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-fg">{formula.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-sm text-muted">
                      {formula.description || 'No description'}
                    </div>
                  </div>
                  <Badge tone={formula.type === 'workflow' ? 'accent' : 'info'}>
                    {formula.type ?? 'formula'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div className="min-w-0">
            <h2 className="font-mono text-sm text-fg">{activeName || 'Select a formula'}</h2>
            <p className="mt-1 text-sm text-muted">{detail?.description || 'Preview structure and step flow.'}</p>
          </div>
          {detail?.schema_version != null && (
            <Badge tone="neutral">schema {detail.schema_version}</Badge>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <div className="font-mono text-2xs uppercase tracking-wider text-faint">Source</div>
            <div className="mt-1 break-all text-xs text-muted">{detail?.source || '—'}</div>
          </div>
          <div>
            <div className="font-mono text-2xs uppercase tracking-wider text-faint">Steps</div>
            <div className="mt-1 text-sm text-fg">{steps.length}</div>
          </div>
          <div>
            <div className="font-mono text-2xs uppercase tracking-wider text-faint">Vars</div>
            <div className="mt-1 text-sm text-fg">
              {Array.isArray(detail?.variables)
                ? detail?.variables.length
                : Array.isArray(detail?.vars)
                  ? detail?.vars.length
                  : typeof detail?.vars === 'number'
                    ? detail.vars
                    : 0}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {steps.length === 0 ? (
            <div className="text-sm text-faint">No structured steps available for this formula.</div>
          ) : (
            steps.slice(0, 8).map((step, index) => (
              <div key={`${activeName}:${index}`} className="rounded-md border border-line bg-surface-alt px-3 py-2.5">
                <div className="font-mono text-2xs text-faint">Step {index + 1}</div>
                <div className="mt-1 text-sm text-fg">{step.title || 'Checklist step'}</div>
                {step.description && (
                  <div className="mt-1 whitespace-pre-wrap text-xs text-muted">
                    {String(step.description).slice(0, 360)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
