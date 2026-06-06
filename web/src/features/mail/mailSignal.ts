import type { Tone } from '@/components/primitives';
import type { MailMessage } from '@/lib/api/types';

/**
 * Mail classification. Gas Town has no dedicated escalation feed — escalations,
 * crashes, and recovery requests all arrive as mail and are identified by their
 * subject line. This is the typed port of the old UI's `getMailSignal`, kept as
 * one small module so the mail surface and tests share one source of truth.
 */

export type MailSignalKey =
  | 'escalation'
  | 'crash'
  | 'recovery'
  | 'delivery'
  | 'note';

export interface MailSignal {
  key: MailSignalKey;
  label: string;
  tone: Tone;
  /** Lower sorts first — most urgent at the top. */
  rank: number;
}

const SIGNALS: Record<MailSignalKey, MailSignal> = {
  escalation: { key: 'escalation', label: 'Escalation', tone: 'danger', rank: 0 },
  crash: { key: 'crash', label: 'Crash', tone: 'danger', rank: 0 },
  recovery: { key: 'recovery', label: 'Recovery', tone: 'warn', rank: 1 },
  delivery: { key: 'delivery', label: 'Delivery', tone: 'info', rank: 2 },
  note: { key: 'note', label: 'Note', tone: 'neutral', rank: 3 },
};

export function mailSignal(mail: Pick<MailMessage, 'subject'>): MailSignal {
  const subject = String(mail?.subject ?? '').toUpperCase();
  if (subject.includes('ESCALATION')) return SIGNALS.escalation;
  if (subject.includes('CRASHED_POLECAT')) return SIGNALS.crash;
  if (subject.includes('RECOVERY_NEEDED') || subject.includes('RECOVERY_UPDATE')) {
    return SIGNALS.recovery;
  }
  if (subject.includes('DELIVERY') || subject.includes('ACK')) return SIGNALS.delivery;
  return SIGNALS.note;
}

export function isEscalation(mail: Pick<MailMessage, 'subject'>): boolean {
  return mailSignal(mail).key === 'escalation';
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

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

/**
 * Severity is carried in the escalation subject (`gt escalate -s HIGH …`) and
 * sometimes mirrored in the mail priority. Scan both, most-severe wins; default
 * to MEDIUM when nothing is stated.
 */
export function severityOf(mail: Pick<MailMessage, 'subject' | 'priority'>): Severity {
  const text = `${mail?.subject ?? ''} ${mail?.priority ?? ''}`.toUpperCase();
  if (text.includes('CRITICAL')) return 'CRITICAL';
  if (text.includes('HIGH')) return 'HIGH';
  if (text.includes('LOW')) return 'LOW';
  return 'MEDIUM';
}

export function severityTone(sev: Severity): Tone {
  return SEVERITY_TONE[sev];
}

export function severityRank(sev: Severity): number {
  return SEVERITY_RANK[sev];
}

/** The message body, normalized across the CLI's `message`/`body` inconsistency. */
export function mailBody(mail: Pick<MailMessage, 'message' | 'body'>): string {
  return mail?.message ?? mail?.body ?? '';
}

/** Inbox order: unread first, then newest. */
export function sortInbox(mail: MailMessage[]): MailMessage[] {
  return [...mail].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return ts(b) - ts(a);
  });
}

/** Escalation triage order: most severe first, then newest. */
export function sortEscalations(mail: MailMessage[]): MailMessage[] {
  return [...mail].sort((a, b) => {
    const sev = severityRank(severityOf(a)) - severityRank(severityOf(b));
    if (sev !== 0) return sev;
    return ts(b) - ts(a);
  });
}

function ts(mail: MailMessage): number {
  const t = new Date(mail.timestamp ?? 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}
