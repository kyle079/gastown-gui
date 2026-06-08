import { Badge, ListRow, Panel, PanelHeader } from '@/components/primitives';
import type { NextActionItem } from './triageModel';

export function NextActionsPanel({ actions }: { actions: NextActionItem[] }) {
  return (
    <Panel flush>
      <PanelHeader title="Next actions" hint={actions.length ? String(actions.length) : undefined} />
      {actions.length === 0 ? (
        <div className="px-4 py-6 text-sm text-faint">No pending actions.</div>
      ) : (
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
      )}
    </Panel>
  );
}
