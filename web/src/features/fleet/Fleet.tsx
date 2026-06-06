import { useState, useMemo } from 'react';
import { Surface } from '@/components/Surface';
import { Panel, Spinner, Button } from '@/components/primitives';
import { useStatus } from '@/lib/query/hooks';
import { pluralize } from '@/lib/utils/format';
import { compareRigs } from './rigHealth';
import { RigList } from './RigList';
import { RigDetail } from './RigDetail';

/**
 * Fleet — the rig surface. One job: see the health of every rig at a glance and
 * drill into one to inspect its crew. A master list (severity-sorted) on the
 * left, the selected rig's detail on the right; on a phone they stack, list
 * first.
 */
export function Fleet() {
  const { data, isLoading, isError, error, refetch } = useStatus();
  const [selected, setSelected] = useState<string | null>(null);

  const rigs = useMemo(() => data?.rigs ?? [], [data]);

  // Default the selection to whichever rig most wants the operator. Resolved
  // here (not in state) so it tracks live data until the operator picks a rig.
  const activeName = useMemo(() => {
    if (selected && rigs.some((r) => r.name === selected)) return selected;
    const top = [...rigs].sort(compareRigs)[0];
    return top?.name ?? null;
  }, [selected, rigs]);

  const activeRig = rigs.find((r) => r.name === activeName) ?? null;

  if (isLoading) {
    return (
      <Surface title="Fleet">
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
          <Spinner />
          Loading fleet…
        </Panel>
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface title="Fleet">
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
    <Surface title="Fleet" description={pluralize(rigs.length, 'rig')}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RigList rigs={rigs} selected={activeName} onSelect={setSelected} />
        </div>
        <div className="lg:col-span-2">
          {activeRig ? (
            <RigDetail rig={activeRig} />
          ) : (
            <Panel className="py-16 text-center text-sm text-faint">
              No rig selected.
            </Panel>
          )}
        </div>
      </div>
    </Surface>
  );
}
