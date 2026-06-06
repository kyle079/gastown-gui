import { Panel, PanelHeader, ListRow, StatusDot, Badge, Button } from '@/components/primitives';
import type { Escalation } from '@/lib/api/types';
import type { Tone } from '@/components/primitives';
import { relativeTime } from '@/lib/utils/format';

export interface EscalationsPanelProps {
  escalations: Escalation[];
  onAck?: (id: string) => void;
  onClose?: (id: string) => void;
  /** When true, drop the panel entirely if there are no escalations. */
  hideWhenEmpty?: boolean;
}

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const SEVERITY_TONE: Record<Severity, Tone> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warn',
  LOW: 'info',
};

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function severityFromLabels(labels: string[] = [], title = ''): Severity {
  const combined = [...labels, title].join(' ').toUpperCase();
  for (const label of labels) {
    if (label.startsWith('severity:')) {
      const sev = label.slice('severity:'.length).toUpperCase() as Severity;
      if (sev in SEVERITY_RANK) return sev;
    }
  }
  if (combined.includes('CRITICAL')) return 'CRITICAL';
  if (combined.includes('HIGH')) return 'HIGH';
  if (combined.includes('LOW')) return 'LOW';
  return 'MEDIUM';
}

function isAcked(labels: string[] = []): boolean {
  return labels.includes('acked');
}

function sortEscalations(items: Escalation[]): Escalation[] {
  return [...items].sort((a, b) => {
    const sevA = severityFromLabels(a.labels, a.title);
    const sevB = severityFromLabels(b.labels, b.title);
    const rankDiff = SEVERITY_RANK[sevA] - SEVERITY_RANK[sevB];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
}

/**
 * Escalations panel — structured data from /api/escalations (gt escalate list --json).
 * Shows open escalations ranked by severity with inline ack/close actions.
 */
export function EscalationsPanel({
  escalations,
  onAck,
  onClose,
  hideWhenEmpty = false,
}: EscalationsPanelProps) {
  const sorted = sortEscalations(escalations);

  if (hideWhenEmpty && sorted.length === 0) return null;

  return (
    <Panel flush>
      <PanelHeader
        title="Escalations"
        hint={sorted.length ? String(sorted.length) : undefined}
      />
      {sorted.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-6 text-sm text-muted">
          <StatusDot tone="ok" />
          No open escalations — nothing needs authorizing.
        </div>
      ) : (
        <div className="divide-hairline">
          {sorted.map((e) => {
            const severity = severityFromLabels(e.labels, e.title);
            const tone = SEVERITY_TONE[severity];
            const acked = isAcked(e.labels);
            return (
              <ListRow
                key={e.id}
                leading={<StatusDot tone={tone} pulse={!acked} />}
                title={
                  <span className="text-fg">{e.title}</span>
                }
                subtitle={
                  <span className="font-mono">{e.created_by ?? '—'}</span>
                }
                trailing={
                  <div className="flex items-center gap-2">
                    <Badge tone={tone}>{severity}</Badge>
                    {acked && <Badge tone="neutral">acked</Badge>}
                    <span className="font-mono tabular-nums text-xs text-faint">
                      {relativeTime(e.created_at)}
                    </span>
                    {!acked && onAck && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onAck(e.id)}
                      >
                        Ack
                      </Button>
                    )}
                    {onClose && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onClose(e.id)}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </Panel>
  );
}
