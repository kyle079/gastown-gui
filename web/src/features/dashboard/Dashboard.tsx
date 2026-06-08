import { Surface } from '@/components/Surface';
import { Panel, Spinner, Button } from '@/components/primitives';
import { useStatus } from '@/lib/query/hooks';
import { MetricStrip } from './MetricStrip';
import { RigsPanel } from './RigsPanel';
import { HqPanel } from './HqPanel';
import { ServicesPanel } from './ServicesPanel';
import { AttentionPanel } from './AttentionPanel';
import { SchedulerPanel } from './SchedulerPanel';
import { FirstRunBanner } from '@/features/help/FirstRunBanner';

/**
 * The reference surface. Proves the design system end to end:
 * tokens + primitives + the TanStack Query data layer + the visual direction.
 *
 * Layout follows "signal over noise": attention first, then the metric strip,
 * then rigs (the work) beside HQ + services (the plumbing).
 */
export function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useStatus();

  if (isLoading) {
    return (
      <Surface title="Overview">
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-muted">
          <Spinner />
          Loading town status…
        </Panel>
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface title="Overview">
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
    <Surface
      title="Overview"
      description="System health at a glance — attention signals, rig status, and service health."
    >
      <div className="flex flex-col gap-4">
        {(data.rigs ?? []).length === 0 && <FirstRunBanner />}
        <AttentionPanel status={data} />
        <MetricStrip summary={data.summary} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RigsPanel rigs={data.rigs ?? []} />
          </div>
          <div className="flex flex-col gap-4">
            <HqPanel agents={data.agents ?? []} />
            <ServicesPanel daemon={data.daemon} dolt={data.dolt} tmux={data.tmux} />
            <SchedulerPanel />
          </div>
        </div>
      </div>
    </Surface>
  );
}
