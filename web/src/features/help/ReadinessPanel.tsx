import { Panel, PanelHeader, StatusDot, Spinner, Button, Badge } from '@/components/primitives';
import { useSetupStatus } from '@/lib/query/hooks';
import { allReady, deriveChecks } from './readiness';

/**
 * First-run readiness — the signal-first panel of the Help surface. Probes the
 * live setup (CLIs, workspace, configured rigs) and tells the operator exactly
 * what, if anything, still stands between them and a working town. Collapses to
 * a single calm line once everything is in place.
 */
export function ReadinessPanel() {
  const { data, isLoading, isError, error, refetch } = useSetupStatus();

  if (isLoading) {
    return (
      <Panel flush>
        <PanelHeader title="Setup" hint="readiness" />
        <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted">
          <Spinner />
          Checking your setup…
        </div>
      </Panel>
    );
  }

  if (isError || !data) {
    return (
      <Panel flush>
        <PanelHeader title="Setup" hint="readiness" />
        <div className="flex flex-col items-start gap-3 px-4 py-6">
          <div>
            <p className="text-sm text-fg">Could not reach the gt bridge to check setup.</p>
            <p className="mt-1 font-mono text-xs text-faint">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <Button variant="default" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </Panel>
    );
  }

  const checks = deriveChecks(data);
  const ready = allReady(checks);
  const remaining = checks.filter((c) => !c.ok).length;

  return (
    <Panel flush>
      <PanelHeader
        title="Setup"
        hint="readiness"
        actions={
          ready ? (
            <Badge tone="ok">ready</Badge>
          ) : (
            <Badge tone="warn">
              {remaining} step{remaining === 1 ? '' : 's'} left
            </Badge>
          )
        }
      />
      <div className="divide-hairline">
        {checks.map((check) => (
          <div key={check.id} className="flex items-start gap-3 px-4 py-2.5">
            <StatusDot tone={check.ok ? 'ok' : 'warn'} className="mt-1.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="shrink-0 text-sm text-fg">{check.label}</span>
                <span
                  className="min-w-0 flex-1 truncate text-right font-mono text-2xs text-faint"
                  title={check.detail}
                >
                  {check.detail}
                </span>
              </div>
              {!check.ok && check.fix && (
                <p className="mt-0.5 text-xs text-muted">{check.fix}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
