import { useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useParams } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { Panel, Spinner, Button } from '@/components/primitives';
import { useStatus } from '@/lib/query/hooks';
import { compareRigs } from './rigHealth';
import { RigList } from './RigList';
import { DogsPanel } from './DogsPanel';

/**
 * Fleet layout — master/detail. Left column: severity-sorted rig list. Right
 * column: the selected rig's detail (rendered by the nested /rigs/$rig route via
 * Outlet). On mount, auto-navigates to the most critical rig if none is selected.
 */
export function Fleet() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { rig?: string };
  const activeName = params.rig ?? null;

  const { data, isLoading, isError, error, refetch } = useStatus();
  const rigs = useMemo(() => data?.rigs ?? [], [data]);

  // Auto-select the most critical rig when landing on /rigs with no selection.
  useEffect(() => {
    if (activeName || isLoading || rigs.length === 0) return;
    const top = [...rigs].sort(compareRigs)[0];
    if (top) {
      void navigate({ to: '/rigs/$rig', params: { rig: top.name }, replace: true });
    }
  }, [activeName, isLoading, rigs, navigate]);

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
    <Surface title="Fleet" description="Supervise rigs and agents — drill into a rig to view active sessions, hooks, and health.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <RigList
            rigs={rigs}
            selected={activeName}
            onSelect={(name) => void navigate({ to: '/rigs/$rig', params: { rig: name } })}
          />
          <DogsPanel />
        </div>
        <div className="lg:col-span-2">
          {activeName ? (
            <Outlet />
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
