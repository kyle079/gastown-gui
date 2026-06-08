import { Link } from '@tanstack/react-router';
import { Panel, PanelHeader, StatusDot } from '@/components/primitives';
import { cn } from '@/lib/utils/cn';
import type { TaskAction } from './detailHubModel';

const linkClassName =
  'inline-flex h-7 shrink-0 items-center rounded border border-line px-2.5 text-xs text-muted transition-colors hover:bg-raised hover:text-fg';

function ActionLink({ action }: { action: TaskAction }) {
  switch (action.target.kind) {
    case 'work':
      return (
        <Link to="/dispatch" className={linkClassName}>
          {action.cta}
        </Link>
      );
    case 'issue':
      return (
        <Link to="/investigate" search={{ mode: 'issues' as const, id: action.target.issueId, status: 'all' }} className={linkClassName}>
          {action.cta}
        </Link>
      );
    case 'convoy':
      return (
        <Link
          to="/dispatch/$convoyId"
          params={{ convoyId: action.target.convoyId }}
          className={linkClassName}
        >
          {action.cta}
        </Link>
      );
    case 'rig':
      return (
        <Link to="/fleet/$rig" params={{ rig: action.target.rig }} className={linkClassName}>
          {action.cta}
        </Link>
      );
    case 'pr':
      return (
        <Link
          to="/landing/$owner/$repo/$prNumber"
          params={{
            owner: action.target.owner,
            repo: action.target.repo,
            prNumber: String(action.target.prNumber),
          }}
          className={linkClassName}
        >
          {action.cta}
        </Link>
      );
    case 'prs':
      return (
        <Link to="/landing" search={{ state: 'open', q: action.target.q }} className={linkClassName}>
          {action.cta}
        </Link>
      );
    default:
      return null;
  }
}

export interface ActionHubPanelProps {
  title?: string;
  hint?: string;
  actions: TaskAction[];
  className?: string;
}

export function ActionHubPanel({
  title = 'Action hub',
  hint,
  actions,
  className,
}: ActionHubPanelProps) {
  if (actions.length === 0) return null;

  return (
    <Panel flush className={className}>
      <PanelHeader title={title} hint={hint ?? `${actions.length} next move${actions.length === 1 ? '' : 's'}`} />
      <div className="divide-y divide-line">
        {actions.map((action) => (
          <div
            key={action.id}
            className={cn('flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between')}
          >
            <div className="flex min-w-0 items-start gap-3">
              <StatusDot tone={action.tone} className="mt-1" />
              <div className="min-w-0">
                <div className="text-sm text-fg">{action.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{action.detail}</p>
              </div>
            </div>
            <ActionLink action={action} />
          </div>
        ))}
      </div>
    </Panel>
  );
}
