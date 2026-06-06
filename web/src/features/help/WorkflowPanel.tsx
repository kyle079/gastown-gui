import { Panel, PanelHeader } from '@/components/primitives';
import { WORKFLOW } from './content';

/**
 * The core loop, stated once. Numbered mono index + a one-line step — a
 * checklist, not a celebration. This is the "first task" guidance for a new
 * operator, and a quick refresher for everyone else.
 */
export function WorkflowPanel() {
  return (
    <Panel flush>
      <PanelHeader title="The core loop" hint="bead → land" />
      <ol className="divide-hairline">
        {WORKFLOW.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3 px-4 py-2.5">
            <span className="mt-px font-mono text-xs tabular-nums text-accent">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <div className="text-sm text-fg">{step.title}</div>
              <p className="mt-0.5 text-xs text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
