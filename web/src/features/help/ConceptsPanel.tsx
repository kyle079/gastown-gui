import { Panel, PanelHeader } from '@/components/primitives';
import { CONCEPTS, CONCEPT_GROUPS, type ConceptGroup } from './content';

/**
 * The "what is this" glossary — a technical reference, not a tour. A term/value
 * definition list (mono term, prose definition), hairline-separated and grouped.
 * Deliberately not an icon-card grid: the structure is the type, not decoration.
 */
export function ConceptsPanel() {
  return (
    <Panel flush>
      <PanelHeader title="Concepts" hint="the vocabulary" />
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
            className="grid grid-cols-1 gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[8rem_1fr]"
          >
            <dt className="font-mono text-sm text-fg">{c.term}</dt>
            <dd className="text-sm text-muted">{c.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
