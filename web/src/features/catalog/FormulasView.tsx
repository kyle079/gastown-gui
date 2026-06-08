import { useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Badge, Dialog, Input, Table, type Column, type Tone } from '@/components/primitives';
import { Surface } from '@/components/Surface';
import type { Formula } from '@/lib/api/types';
import { useFormulas } from '@/lib/query/hooks';
import { CatalogPanel } from './CatalogPanel';
import { DetailField } from './DetailField';

function typeTone(type: string | undefined): Tone {
  switch (type) {
    case 'workflow':
      return 'accent';
    case 'convoy':
      return 'info';
    default:
      return 'neutral';
  }
}

export interface FormulasSearch {
  q?: string;
}

export function validateFormulasSearch(search: Record<string, unknown>): FormulasSearch {
  return {
    q: typeof search.q === 'string' ? search.q : undefined,
  };
}

function matches(f: Formula, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    f.name.toLowerCase().includes(needle) ||
    (f.description ?? '').toLowerCase().includes(needle) ||
    (f.type ?? '').toLowerCase().includes(needle)
  );
}

const columns: Column<Formula>[] = [
  {
    key: 'name',
    header: 'Name',
    width: '24%',
    cell: (f) => <span className="font-mono text-sm text-fg">{f.name}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    width: '12%',
    cell: (f) => <Badge tone={typeTone(f.type)}>{f.type ?? '—'}</Badge>,
  },
  {
    key: 'description',
    header: 'Description',
    cell: (f) => <span className="text-muted">{f.description || '—'}</span>,
  },
  {
    key: 'steps',
    header: 'Steps',
    align: 'right',
    width: '10%',
    cell: (f) => <span className="font-mono text-xs tabular-nums text-faint">{f.steps ?? 0}</span>,
  },
];

export function FormulasView() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as FormulasSearch;
  const query = search.q ?? '';
  const [selected, setSelected] = useState<Formula | null>(null);

  const { data, isLoading, isError, error, refetch } = useFormulas();

  const rows = useMemo(() => {
    const formulas = data ?? [];
    return formulas
      .filter((f) => matches(f, query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, query]);

  const total = data?.length ?? 0;
  const hint = query ? `${rows.length} of ${total}` : String(total);

  return (
    <Surface
      title="Formulas"
      description="Workflow and convoy templates available for dispatch. Search by name, type, or purpose."
    >
      <CatalogPanel
        title="Templates"
        hint={hint}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        filters={
          <Input
            type="search"
            placeholder="Filter by name, type, or description…"
            value={query}
            onChange={(e) =>
              void navigate({ to: '/investigate', search: { mode: 'formulas' as const, q: e.target.value || undefined } })
            }
            className="sm:max-w-xs"
          />
        }
      >
        <Table
          columns={columns}
          rows={rows}
          rowKey={(f) => f.name}
          onRowClick={setSelected}
          empty={query ? 'No workflow templates match your filter.' : 'No workflow templates defined yet.'}
        />
      </CatalogPanel>

      <Dialog
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected ? <span className="font-mono text-sm">{selected.name}</span> : undefined}
        description={selected?.description}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div>
              <DetailField label="Type">
                <Badge tone={typeTone(selected.type)}>{selected.type ?? '—'}</Badge>
              </DetailField>
              <DetailField label="Steps">{selected.steps ?? 0}</DetailField>
              <DetailField label="Vars">{selected.vars ?? 0}</DetailField>
            </div>
            {selected.source && (
              <div>
                <p className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-faint">Source</p>
                <p className="break-all font-mono text-xs text-muted">{selected.source}</p>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </Surface>
  );
}
