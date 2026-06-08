import { useDeferredValue, useMemo, useState } from 'react';
import { Badge, Button, Input, Spinner } from '@/components/primitives';
import { priorityLabel, priorityTone, statusLabel, statusTone } from '@/features/catalog/catalogMeta';
import { useBeads, useBeadSearch } from '@/lib/query/hooks';
import { relativeTime } from '@/lib/utils/format';
import { buildDispatchBrowseList } from './beadPickerModel';

export function BeadPicker({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const { data: beads, isLoading: queueLoading } = useBeads('all');
  const { data: searchResults, isLoading: searchLoading } = useBeadSearch(deferredQuery);

  const hasQuery = deferredQuery.trim().length >= 2;
  const browseList = useMemo(() => buildDispatchBrowseList(beads ?? []), [beads]);
  const results = hasQuery ? searchResults ?? [] : browseList;
  const selectedBead = useMemo(
    () => [...(searchResults ?? []), ...browseList].find((item) => item.id === value) ?? null,
    [browseList, searchResults, value],
  );
  const isLoading = manualMode ? false : hasQuery ? searchLoading : queueLoading;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xs uppercase tracking-wider text-faint">Bead</span>
        <Button size="sm" variant="ghost" onClick={() => setManualMode((current) => !current)}>
          {manualMode ? 'Back To Picker' : 'Use Bead ID Manually'}
        </Button>
      </div>

      {manualMode ? (
        <Input
          aria-label="Manual bead id"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. gg-071"
          className="font-mono"
          autoFocus={autoFocus}
        />
      ) : (
        <>
          <Input
            aria-label="Search beads"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bead id, title, or type…"
            autoFocus={autoFocus}
          />

          <div className="overflow-hidden rounded-md border border-line bg-surface-alt">
            <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
              <span className="font-mono text-2xs uppercase tracking-wider text-faint">
                {hasQuery ? 'Search Results' : 'Suggested Queue'}
              </span>
              <span className="text-2xs text-faint">
                {hasQuery ? `${results.length} match${results.length === 1 ? '' : 'es'}` : 'Active dispatch candidates'}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted">
                <Spinner />
                Loading beads…
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-4 text-sm text-faint">
                {hasQuery ? 'No beads match this search.' : 'No active beads available to browse right now.'}
              </div>
            ) : (
              <div className="max-h-72 divide-y divide-line overflow-auto">
                {results.map((result) => {
                  const isSelected = result.id === value;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => onChange(result.id)}
                      className={`w-full px-3 py-3 text-left transition-colors ${
                        isSelected ? 'bg-raised' : 'hover:bg-raised'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-fg">{result.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-2xs text-faint">
                            <span>{result.id}</span>
                            {result.issue_type ? <span>{result.issue_type}</span> : null}
                            {result.updated_at ? <span>{relativeTime(result.updated_at)}</span> : null}
                          </div>
                          {result.labels && result.labels.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {result.labels.slice(0, 3).map((label) => (
                                <Badge key={`${result.id}:${label}`}>{label}</Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge tone={priorityTone(result.priority)}>{priorityLabel(result.priority)}</Badge>
                          <Badge tone={statusTone(result.status)}>{statusLabel(result.status)}</Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {value ? (
        <div className="rounded-md border border-line bg-surface px-3 py-2">
          <div className="font-mono text-xs text-fg">{value}</div>
          <div className="mt-1 text-sm text-muted">
            {selectedBead?.title || (manualMode ? 'Manual bead id selected.' : 'Selected for dispatch.')}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-line px-3 py-3 text-sm text-faint">
          Choose a bead from the queue or switch to manual mode for an exact id.
        </div>
      )}
    </div>
  );
}
