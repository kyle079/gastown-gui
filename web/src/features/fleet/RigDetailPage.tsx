import { useParams } from '@tanstack/react-router';
import { Panel, Spinner } from '@/components/primitives';
import { useStatus } from '@/lib/query/hooks';
import { RigDetail } from './RigDetail';

/**
 * Routed rig detail — rendered in the Fleet layout's right-column Outlet.
 * Derives the rig name from the route param and finds it in the cached status query.
 */
export function RigDetailPage() {
  const { rig: rigName } = useParams({ strict: false }) as { rig: string };
  const { data, isLoading } = useStatus();

  if (isLoading) {
    return (
      <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
        <Spinner />
        Loading rig…
      </Panel>
    );
  }

  const rig = data?.rigs.find((r) => r.name === rigName);
  if (!rig) {
    return (
      <Panel className="py-16 text-center text-sm text-faint">
        Rig not found: <span className="font-mono">{rigName}</span>
      </Panel>
    );
  }

  return <RigDetail rig={rig} />;
}
