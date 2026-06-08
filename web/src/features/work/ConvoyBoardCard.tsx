import { Badge, StatusPill } from '@/components/primitives';
import type { Convoy } from '@/lib/api/types';
import { relativeTime } from '@/lib/utils/format';
import { assignees, convoySignal, shortAgent, trackedBeadState } from './workState';

function convoyTitle(raw: string): string {
  return raw.replace(/^Work:\s*/i, '').trim() || raw;
}

function progressLabel(convoy: Convoy): string {
  return `${convoy.completed}/${convoy.total} done`;
}

function blockedCount(convoy: Convoy): number {
  return (convoy.tracked ?? []).filter((bead) => trackedBeadState(bead) === 'blocked').length;
}

function pendingCount(convoy: Convoy): number {
  return Math.max(0, convoy.total - convoy.completed);
}

function progressWidth(convoy: Convoy): string {
  if (convoy.total <= 0) return '0%';
  return `${Math.min(100, Math.round((convoy.completed / convoy.total) * 100))}%`;
}

function statusDetail(convoy: Convoy): string {
  const signal = convoySignal(convoy);
  if (signal.state === 'blocked') {
    return `${blockedCount(convoy)} blocked bead${blockedCount(convoy) === 1 ? '' : 's'} need follow-up`;
  }
  if (signal.state === 'active') {
    return `${pendingCount(convoy)} bead${pendingCount(convoy) === 1 ? '' : 's'} still moving`;
  }
  if (signal.state === 'done') {
    return 'Convoy complete';
  }
  return `${pendingCount(convoy)} bead${pendingCount(convoy) === 1 ? '' : 's'} waiting to dispatch`;
}

export function ConvoyBoardCard({
  convoy,
  onInspect,
}: {
  convoy: Convoy;
  onInspect: (convoy: Convoy) => void;
}) {
  const signal = convoySignal(convoy);
  const allOperators = assignees(convoy.tracked);
  const operators = allOperators.slice(0, 3);
  const extraOperators = Math.max(0, allOperators.length - operators.length);

  return (
    <button
      type="button"
      onClick={() => onInspect(convoy)}
      className="flex w-full flex-col gap-3 rounded-md border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm text-fg">{convoyTitle(convoy.title)}</div>
          <div className="mt-1 font-mono text-2xs text-faint">
            {convoy.id}
            {convoy.created_at ? ` · ${relativeTime(convoy.created_at)}` : ''}
          </div>
        </div>
        <StatusPill tone={signal.tone} pulse={signal.pulse} label={signal.label} className="shrink-0" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3 font-mono text-xs text-muted">
          <span>{progressLabel(convoy)}</span>
          <span>{statusDetail(convoy)}</span>
        </div>
        <span className="block h-1.5 overflow-hidden rounded-sm bg-line" aria-hidden>
          <span
            className="block h-full bg-accent transition-[width] duration-150"
            style={{ width: progressWidth(convoy) }}
          />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {operators.length === 0 ? (
          <Badge>unassigned</Badge>
        ) : (
          operators.map((operator) => (
            <Badge key={operator} tone={signal.state === 'blocked' ? 'warn' : 'neutral'}>
              {shortAgent(operator)}
            </Badge>
          ))
        )}
        {extraOperators > 0 && <Badge tone="info">+{extraOperators}</Badge>}
      </div>

      <div className="flex justify-end border-t border-line pt-2">
        <span className="text-xs text-muted">
          Inspect
        </span>
      </div>
    </button>
  );
}
