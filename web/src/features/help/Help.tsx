import { Surface } from '@/components/Surface';
import { ReadinessPanel } from './ReadinessPanel';
import { ConceptsPanel } from './ConceptsPanel';
import { WorkflowPanel } from './WorkflowPanel';
import { KeyboardPanel } from './KeyboardPanel';

/**
 * Help — one surface, one job: orient the operator.
 *
 * Order follows the IA spec: setup readiness first (is the system ready?),
 * then the first operator workflow (what do I do?), then the glossary (what
 * does this mean?), then keyboard shortcuts (once the workflow is understood).
 */
export function Help() {
  return (
    <Surface
      title="Help"
      description="New here? Start with setup, then the first operator workflow."
    >
      <div className="flex flex-col gap-4">
        <ReadinessPanel />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-1">
            <WorkflowPanel />
            <KeyboardPanel />
          </div>
          <div className="lg:col-span-2">
            <ConceptsPanel />
          </div>
        </div>
      </div>
    </Surface>
  );
}
