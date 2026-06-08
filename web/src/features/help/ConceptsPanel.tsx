import { Panel, PanelHeader } from '@/components/primitives';
import { CONCEPTS, CONCEPT_GROUPS, type ConceptGroup } from './content';

/**
 * Plain-language glossary. Plain action label first; Gas Town term appears as a
 * secondary mono tag so experts can cross-reference but newcomers aren't blocked.
 */
export function ConceptsPanel() {
  return (
    <Panel flush>
      <PanelHeader title="Glossary" hint="plain language first" />
      <div className="divide-hairline">
        {CONCEPT_GROUPS.map((group) => (
          <ConceptGroupRows key={group} group={group} />
        ))}
      </div>
    </Panel>
  );
}

function ConceptGroupRows({ group }: { group: ConceptGroup }) {
  const items = CONCEPTS.filter((c) => c.group === group);
  if (items.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <h3 className="mb-2 font-mono text-2xs tracking-wider text-faint">{group}</h3>
      <dl className="divide-hairline">
        {items.map((c) => (
          <div
            key={c.term}
            className="grid grid-cols-1 gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[10rem_1fr]"
          >
            <dt className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-fg">
              <span>{c.term}</span>
              {c.gasLabel && (
                <span className="font-mono text-2xs text-faint">({c.gasLabel})</span>
              )}
            </dt>
            <dd className="text-sm text-muted">{c.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
