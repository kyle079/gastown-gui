import { useNavigate } from '@tanstack/react-router';
import { ListRow, Panel, PanelHeader, StatusDot } from '@/components/primitives';
import type { WorkAttentionItem } from './triageModel';

export function WorkAttentionPanel({ items }: { items: WorkAttentionItem[] }) {
  const navigate = useNavigate();

  return (
    <Panel flush>
      <PanelHeader title="Needs attention" hint={items.length ? String(items.length) : undefined} />
      {items.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-6 text-sm text-muted">
          <StatusDot tone="ok" />
          Nothing needs attention right now.
        </div>
      ) : (
        <div className="divide-hairline">
          {items.map((item) => (
            <ListRow
              key={item.id}
              interactive={!!item.route}
              onClick={item.route ? () => void navigate({ to: item.route as string }) : undefined}
              leading={<StatusDot tone={item.tone} pulse={item.tone === 'accent'} />}
              title={<span className="font-mono text-sm">{item.title}</span>}
              subtitle={item.detail}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
