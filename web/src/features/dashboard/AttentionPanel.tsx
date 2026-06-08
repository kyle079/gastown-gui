import { useNavigate } from '@tanstack/react-router';
import { Panel, PanelHeader, ListRow, StatusDot, type Tone } from '@/components/primitives';
import type { TownStatus } from '@/lib/api/types';

interface AttentionItem {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  route: string;
}

/**
 * Signal over noise: the one panel that earns the top-left slot.
 * Collects everything that wants the operator — stalled/blocked agents,
 * rigs missing a witness or refinery, unread mail — and nothing else.
 */
function collect(status: TownStatus): AttentionItem[] {
  const items: AttentionItem[] = [];

  const everyAgent = [
    ...(status.agents ?? []),
    ...(status.rigs ?? []).flatMap((r) => r.agents ?? []),
  ];

  for (const a of everyAgent) {
    const rig = a.address?.split('/')[0] ?? '';
    const route = rig ? `/fleet/${rig}` : '/fleet';
    if (a.state === 'stalled') {
      items.push({ id: `stall:${a.address}`, tone: 'danger', title: a.address || a.name, detail: 'stalled', route });
    } else if (a.state === 'blocked') {
      items.push({ id: `block:${a.address}`, tone: 'warn', title: a.address || a.name, detail: 'blocked', route });
    }
  }

  for (const rig of status.rigs ?? []) {
    if (!rig.has_witness) {
      items.push({ id: `nowit:${rig.name}`, tone: 'warn', title: rig.name, detail: 'no witness', route: `/fleet/${rig.name}` });
    }
    if (!rig.has_refinery) {
      items.push({ id: `noref:${rig.name}`, tone: 'warn', title: rig.name, detail: 'no refinery', route: `/fleet/${rig.name}` });
    }
  }

  if (status.overseer?.unread_mail) {
    items.push({
      id: 'mail',
      tone: 'info',
      title: 'Overseer mail',
      detail: `${status.overseer.unread_mail} unread`,
      route: '/attention',
    });
  }

  // Most severe first.
  const rank: Record<Tone, number> = { danger: 0, warn: 1, info: 2, accent: 3, ok: 4, neutral: 5 };
  return items.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

export function AttentionPanel({ status }: { status: TownStatus }) {
  const navigate = useNavigate();
  const items = collect(status);

  return (
    <Panel flush>
      <PanelHeader title="Needs attention" hint={items.length ? String(items.length) : undefined} />
      {items.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-6 text-sm text-muted">
          <StatusDot tone="ok" />
          All clear — nothing needs you right now.
        </div>
      ) : (
        <div className="divide-hairline">
          {items.map((item) => (
            <ListRow
              key={item.id}
              interactive
              onClick={() => void navigate({ to: item.route })}
              leading={<StatusDot tone={item.tone} />}
              title={<span className="font-mono text-sm">{item.title}</span>}
              trailing={
                <span className={item.tone === 'info' ? 'text-info' : 'text-fg'}>{item.detail}</span>
              }
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
