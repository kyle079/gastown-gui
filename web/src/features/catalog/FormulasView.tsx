import { useMemo, useState } from 'react';
import { Badge, Dialog, Panel, Select, Table, type Column } from '@/components/primitives';
import type { Formula } from '@/lib/api/types';
import { useFormulas } from '@/lib/query/hooks';
import { filterFormulas, formulaTypes } from './catalog';
import { Toolbar, LoadingState, ErrorState } from './CatalogChrome';

/** Formulas segment — the workflow-template catalog. Rows open a read-only detail. */
export function FormulasView({ active }: { active: boolean }) {
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Formula | null>(null);

  const { data, isLoading, isError, error, refetch } = useFormulas(active);
  const formulas = useMemo(() => data ?? [], [data]);
  const types = useMemo(() => formulaTypes(formulas), [formulas]);
  const rows = useMemo(() => filterFormulas(formulas, query, type), [formulas, query, type]);

  const columns: Column<Formula>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '200px',
      cell: (f) => <span className="font-mono text-xs text-fg">{f.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      width: '96px',
      cell: (f) => (f.type ? <Badge tone="accent">{f.type}</Badge> : <span className="text-faint">—</span>),
    },
    {
      key: 'description',
      header: 'Description',
      className: 'max-w-0',
      cell: (f) => (
        <span className="block truncate text-muted md:max-w-[40ch] lg:max-w-[60ch]">
          {f.description || '—'}
        </span>
      ),
    },
    {
      key: 'steps',
      header: 'Steps',
      width: '64px',
      align: 'right',
      cell: (f) => <span className="font-mono text-2xs text-faint">{f.steps ?? '—'}</span>,
    },
  ];

  if (isLoading) return <LoadingState label="Loading formulas…" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search formulas — name, description…"
        filter={
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter by type"
            className="sm:w-40"
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        }
        count={`${rows.length} of ${formulas.length}`}
      />

      <Panel flush>
        <Table
          columns={columns}
          rows={rows}
          rowKey={(f) => f.name}
          onRowClick={setSelected}
          empty={query || type ? 'No formulas match.' : 'No formulas.'}
        />
      </Panel>

      <FormulaDialog formula={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function FormulaDialog({ formula, onClose }: { formula: Formula | null; onClose: () => void }) {
  if (!formula) return null;
  return (
    <Dialog
      open={!!formula}
      onClose={onClose}
      title={<span className="font-mono">{formula.name}</span>}
      description={formula.type}
      className="sm:max-w-xl"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted">
          {formula.description || 'No description.'}
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs">
          {formula.type && <Meta label="Type" value={formula.type} />}
          {formula.steps != null && <Meta label="Steps" value={String(formula.steps)} />}
          {formula.vars != null && <Meta label="Vars" value={String(formula.vars)} />}
        </dl>
        {formula.source && (
          <p className="break-all font-mono text-2xs text-faint">{formula.source}</p>
        )}
      </div>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-faint">{label}</dt>
      <dd className="truncate font-mono text-muted">{value}</dd>
    </div>
  );
}
