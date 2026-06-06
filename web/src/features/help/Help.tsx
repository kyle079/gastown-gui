import { Surface } from '@/components/Surface';
import { ReadinessPanel } from './ReadinessPanel';
import { ConceptsPanel } from './ConceptsPanel';
import { WorkflowPanel } from './WorkflowPanel';
import { KeyboardPanel } from './KeyboardPanel';

/**
 * Help / Getting Started — one surface, one job: orient the operator.
 *
 * It replaces the old multi-modal onboarding wizard + tutorial (which did too
 * much and performed mutations) with a calm, read-only reference: live setup
 * readiness first (signal over noise), then the vocabulary, the core loop, and
 * the keyboard map. Mutations live on their own surfaces; this one teaches.
 */
export function Help() {
  return (
    <Surface
      title="Help"
      description="What things are, and how to drive. New here? Start with setup, then the core loop."
    >
      <div className="flex flex-col gap-4">
        <ReadinessPanel />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ConceptsPanel />
          </div>
          <div className="flex flex-col gap-4">
            <WorkflowPanel />
            <KeyboardPanel />
          </div>
        </div>
      </div>
    </Surface>
  );
}
