import { Link } from '@tanstack/react-router';
import { Panel, PanelHeader } from '@/components/primitives';
import { FIRST_WORKFLOW } from './content';
import { NAV_ITEMS } from '@/app/navigation';

/**
 * The first operator workflow — what to do on your first shift.
 * Numbered steps, each linked to the surface where the action lives.
 * Surface names come from NAV_ITEMS so they stay in sync with navigation.
 */
export function WorkflowPanel() {
  const surfacePaths = Object.fromEntries(NAV_ITEMS.map((n) => [n.label, n.path]));

  return (
    <Panel flush>
      <PanelHeader title="First operator workflow" hint="start here" />
      <ol className="divide-hairline">
        {FIRST_WORKFLOW.map((step, i) => {
          const path = step.surface ? surfacePaths[step.surface] : undefined;
          return (
            <li key={step.title} className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-px font-mono text-xs tabular-nums text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-fg">
                  <span>{step.title}</span>
                  {path && (
                    <Link
                      to={path}
                      className="font-mono text-2xs text-accent underline-offset-2 hover:underline"
                    >
                      → {step.surface}
                    </Link>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
