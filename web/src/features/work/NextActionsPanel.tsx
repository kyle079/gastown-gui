import { Badge, ListRow, Panel, PanelHeader } from '@/components/primitives';
import type { NextActionItem } from './triageModel';

export function NextActionsPanel({ actions }: { actions: NextActionItem[] }) {
  return (
    <Panel flush>
      <PanelHeader title="Next actions" hint={String(actions.length)} />
      <div className="divide-hairline">
        {actions.map((action, index) => (
          <ListRow
            key={action.id}
            leading={<Badge tone={action.tone}>{String(index + 1).padStart(2, '0')}</Badge>}
            title={action.title}
            subtitle={action.detail}
          />
        ))}
      </div>
    </Panel>
  );
}
