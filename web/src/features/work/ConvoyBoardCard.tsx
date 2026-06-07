import { Badge, StatusPill } from '@/components/primitives';
import type { Convoy } from '@/lib/api/types';
import { relativeTime } from '@/lib/utils/format';
import { assignees, convoySignal, shortAgent } from './workState';

function convoyTitle(raw: string): string {
  return raw.replace(/^Work:\s*/i, '').trim() || raw;
}

function progressLabel(convoy: Convoy): string {
  return `${convoy.completed}/${convoy.total} done`;
}

function blockedCount(convoy: Convoy): number {
  return (convoy.tracked ?? []).filter((bead) => bead.blocked).length;
}

function pendingCount(convoy: Convoy): number {
  return Math.max(0, convoy.total - convoy.completed);
}

function activeCount(convoy: Convoy): number {
  return (convoy.tracked ?? []).filter((bead) =>
    ['hooked', 'in_progress', 'working'].includes(String(bead.status)),
  ).length;
}

function progressWidth(convoy: Convoy): string {
  if (convoy.total <= 0) return '0%';
  return `${Math.min(100, Math.round((convoy.completed / convoy.total) * 100))}%`;
}

function nextAction(convoy: Convoy): string {
  const signal = convoySignal(convoy);
  if (signal.state === 'blocked') return 'Operator follow-up';
  if (signal.state === 'active') return 'Monitor progress';
  if (signal.state === 'done') return 'Review outcome';
  return 'Dispatch next bead';
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
  const title = convoyTitle(convoy.title);
  const blocked = blockedCount(convoy);
  const active = activeCount(convoy);
  const pending = pendingCount(convoy);
  const label = `Inspect convoy ${title}. ${progressLabel(convoy)}. ${statusDetail(convoy)}.`;

  return (
    <button
      type="button"
      onClick={() => onInspect(convoy)}
      aria-label={label}
      className="flex w-full flex-col gap-3 rounded-md border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-line-strong hover:bg-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-2xs uppercase tracking-[0.18em] text-faint">{nextAction(convoy)}</div>
          <div className="mt-1 line-clamp-2 text-sm text-fg">{title}</div>
          <div className="mt-1 font-mono text-2xs text-faint">
            {convoy.id}
            {convoy.created_at ? ` · ${relativeTime(convoy.created_at)}` : ''}
          </div>
        </div>
        <StatusPill tone={signal.tone} pulse={signal.pulse} label={signal.label} className="shrink-0" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={signal.state === 'blocked' ? 'warn' : signal.state === 'done' ? 'ok' : 'info'}>
          {progressLabel(convoy)}
        </Badge>
        {blocked > 0 && <Badge tone="warn">{blocked} blocked</Badge>}
        {active > 0 && <Badge tone="accent">{active} live</Badge>}
        {pending > 0 && <Badge tone="neutral">{pending} pending</Badge>}
      </div>

      <div className="space-y-1.5">
        <div className="text-sm text-muted">{statusDetail(convoy)}</div>
        <span className="block h-1.5 overflow-hidden rounded-sm bg-line" aria-hidden>
          <span
            className="block h-full bg-accent transition-[width] duration-150"
            style={{ width: progressWidth(convoy) }}
          />
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-2xs uppercase tracking-[0.18em] text-faint">Operators</span>
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
        <span className="text-xs text-muted">Inspect</span>
      </div>
    </button>
  );
}
