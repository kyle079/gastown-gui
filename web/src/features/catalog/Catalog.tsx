import { useState } from 'react';
import { Surface } from '@/components/Surface';
import { useBeads, useFormulas, usePullRequests } from '@/lib/query/hooks';
import { Segmented, type SegmentOption } from './Segmented';
import { IssuesView } from './IssuesView';
import { PullRequestsView } from './PullRequestsView';
import { FormulasView } from './FormulasView';

type Segment = 'issues' | 'prs' | 'formulas';

/**
 * Catalog — one surface, one job: browse the three things the operator looks
 * up and acts on (issues, open PRs, formulas). A segmented control swaps
 * between three focused list views; each view owns its own search + filter and
 * only the active segment polls. Issues and formulas open a read-only detail;
 * a PR opens on GitHub.
 */
export function Catalog() {
  const [segment, setSegment] = useState<Segment>('issues');

  // Count badges on the segments. These reuse the same cached queries the views
  // consume; the active segment keeps them fresh.
  const beadCount = useBeads('', segment === 'issues').data?.length;
  const prCount = usePullRequests('open', segment === 'prs').data?.length;
  const formulaCount = useFormulas(segment === 'formulas').data?.length;

  const options: SegmentOption<Segment>[] = [
    { value: 'issues', label: 'Issues', glyph: '◇', count: beadCount },
    { value: 'prs', label: 'PRs', glyph: '⎇', count: prCount },
    { value: 'formulas', label: 'Formulas', glyph: '⊟', count: formulaCount },
  ];

  return (
    <Surface
      title="Catalog"
      description="Issues, open PRs, and formulas — search, filter, and act."
    >
      <div className="mb-4">
        <Segmented
          options={options}
          value={segment}
          onChange={setSegment}
          aria-label="Catalog view"
        />
      </div>

      {/* All views stay mounted so search/filter state survives a segment switch;
          only the active one is visible and only the active one polls. */}
      <div hidden={segment !== 'issues'}>
        <IssuesView active={segment === 'issues'} />
      </div>
      <div hidden={segment !== 'prs'}>
        <PullRequestsView active={segment === 'prs'} />
      </div>
      <div hidden={segment !== 'formulas'}>
        <FormulasView active={segment === 'formulas'} />
      </div>
    </Surface>
  );
}
