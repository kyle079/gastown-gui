import { ListRow, Panel, PanelHeader, StatusDot } from '@/components/primitives';
import type { WorkAttentionItem } from './triageModel';

export function WorkAttentionPanel({ items }: { items: WorkAttentionItem[] }) {
  return (
    <Panel flush>
      <PanelHeader title="Needs attention" hint={String(items.length)} />
      <div className="divide-hairline">
        {items.map((item) => (
          <ListRow
            key={item.id}
            leading={<StatusDot tone={item.tone} pulse={item.tone === 'accent'} />}
            title={<span className="font-mono text-sm">{item.title}</span>}
            subtitle={item.detail}
          />
        ))}
      </div>
    </Panel>
  );
}
