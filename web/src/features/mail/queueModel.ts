import type { Tone } from '@/components/primitives';
import type { Escalation, MailMessage } from '@/lib/api/types';
import { isEscalation, mailSignal, severityTone, type Severity } from './mailSignal';

export type QueueFilter = 'all' | 'action' | 'unread' | 'escalations';
export type QueueActionState = 'needs_ack' | 'acked' | 'needs_review' | 'unread' | 'read';

export interface MailQueueItem {
  id: string;
  kind: 'mail' | 'escalation';
  title: string;
  source: string;
  timestamp: string;
  tone: Tone;
  signalLabel: string;
  actionState: QueueActionState;
  actionLabel: string;
  severity?: Severity;
  read?: boolean;
  escalationLabels?: string[];
  mail?: MailMessage;
  escalation?: Escalation;
}

const ACTION_RANK: Record<QueueActionState, number> = {
  needs_ack: 0,
  needs_review: 1,
  unread: 2,
  acked: 3,
  read: 4,
};

function isAcked(labels: string[] = []): boolean {
  return labels.includes('acked');
}

function escalationItem(escalation: Escalation): MailQueueItem {
  const severity = severityFromEscalation(escalation);
  const acked = isAcked(escalation.labels);
  return {
    id: escalation.id,
    kind: 'escalation',
    title: escalation.title || '(untitled escalation)',
    source: escalation.created_by || '—',
    timestamp: escalation.created_at || escalation.updated_at || '',
    tone: severityTone(severity),
    signalLabel: severity,
    actionState: acked ? 'acked' : 'needs_ack',
    actionLabel: acked ? 'Acked' : 'Needs ack',
    severity,
    escalationLabels: escalation.labels,
    escalation,
  };
}

function mailItem(mail: MailMessage): MailQueueItem {
  const signal = mailSignal(mail);
  const needsReview = signal.tone === 'danger' || signal.tone === 'warn';
  const unread = !mail.read;
  return {
    id: mail.id,
    kind: 'mail',
    title: mail.subject || '(no subject)',
    source: mail.from || '—',
    timestamp: mail.timestamp || '',
    tone: signal.tone,
    signalLabel: signal.label,
    actionState: unread ? (needsReview ? 'needs_review' : 'unread') : 'read',
    actionLabel: unread ? (needsReview ? 'Needs review' : 'Unread') : 'Read',
    read: mail.read,
    mail,
  };
}

export function buildMailQueue(mail: MailMessage[], escalations: Escalation[]): MailQueueItem[] {
  const queue = [
    ...escalations.map(escalationItem),
    // Structured escalations are authoritative; drop escalation-shaped mail to avoid duplicate triage rows.
    ...mail.filter((item) => !isEscalation(item)).map(mailItem),
  ];

  return queue.sort((a, b) => {
    const actionDiff = ACTION_RANK[a.actionState] - ACTION_RANK[b.actionState];
    if (actionDiff !== 0) return actionDiff;
    if (a.kind === 'escalation' && b.kind === 'escalation') {
      const severityDiff = severityRank(a.severity) - severityRank(b.severity);
      if (severityDiff !== 0) return severityDiff;
    }
    return ts(b.timestamp) - ts(a.timestamp);
  });
}

export function filterMailQueue(items: MailQueueItem[], filter: QueueFilter): MailQueueItem[] {
  switch (filter) {
    case 'action':
      return items.filter((item) => item.actionState === 'needs_ack' || item.actionState === 'needs_review');
    case 'unread':
      return items.filter((item) => item.actionState !== 'read' && item.actionState !== 'acked');
    case 'escalations':
      return items.filter((item) => item.kind === 'escalation');
    default:
      return items;
  }
}

export function queueSummary(items: MailQueueItem[]) {
  return {
    total: items.length,
    action: items.filter((item) => item.actionState === 'needs_ack' || item.actionState === 'needs_review').length,
    unread: items.filter((item) => item.actionState !== 'read' && item.actionState !== 'acked').length,
    escalations: items.filter((item) => item.kind === 'escalation').length,
  };
}

function severityFromEscalation(escalation: Escalation): Severity {
  const combined = [...(escalation.labels ?? []), escalation.title ?? ''].join(' ').toUpperCase();
  for (const label of escalation.labels ?? []) {
    if (label.startsWith('severity:')) {
      const sev = label.slice('severity:'.length).toUpperCase() as Severity;
      if (sev === 'CRITICAL' || sev === 'HIGH' || sev === 'MEDIUM' || sev === 'LOW') return sev;
    }
  }
  if (combined.includes('CRITICAL')) return 'CRITICAL';
  if (combined.includes('HIGH')) return 'HIGH';
  if (combined.includes('LOW')) return 'LOW';
  return 'MEDIUM';
}

function severityRank(severity?: Severity): number {
  switch (severity) {
    case 'CRITICAL':
      return 0;
    case 'HIGH':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 3;
    default:
      return 99;
  }
}

function ts(value: string): number {
  const parsed = new Date(value || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
