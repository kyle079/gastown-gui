import type { MailMessage } from '@/lib/api/types';
import type { Tone } from '@/components/primitives';

/**
 * Mail signal + severity, derived — not stored. The operator's question for any
 * surface is "what needs me?", so the inbox is read through a signal lens ported
 * from the old `getMailSignal`: a few categories the system actually produces,
 * each with a tone and an urgency rank. Escalations are pulled out separately
 * (see {@link isEscalation}) and graded by {@link severity}.
 */

export type SignalKey =
  | 'crash'
  | 'escalation'
  | 'recovery-needed'
  | 'recovery-update'
  | 'delivery'
  | 'note';

export interface MailSignal {
  key: SignalKey;
  label: string;
  tone: Tone;
  /** Lower is more urgent — drives ordering when severity is equal. */
  rank: number;
}

const SIGNAL: Record<SignalKey, Omit<MailSignal, 'key'>> = {
  crash: { label: 'Crash', tone: 'danger', rank: 0 },
  escalation: { label: 'Escalation', tone: 'danger', rank: 0 },
  'recovery-needed': { label: 'Recovery', tone: 'danger', rank: 0 },
  'recovery-update': { label: 'Recovery', tone: 'warn', rank: 1 },
  delivery: { label: 'Delivery', tone: 'warn', rank: 1 },
  note: { label: 'Note', tone: 'neutral', rank: 2 },
};

function subjectOf(mail: MailMessage): string {
  return String(mail?.subject ?? '').toUpperCase();
}

/** Classify a message into one signal category. Order matters: most urgent wins. */
export function mailSignal(mail: MailMessage): MailSignal {
  const subject = subjectOf(mail);
  if (subject.includes('CRASHED_POLECAT') || subject.includes('CRASH'))
    return { key: 'crash', ...SIGNAL.crash };
  if (subject.includes('ESCALATION')) return { key: 'escalation', ...SIGNAL.escalation };
  if (subject.includes('RECOVERY_NEEDED'))
    return { key: 'recovery-needed', ...SIGNAL['recovery-needed'] };
  if (subject.includes('RECOVERY_UPDATE'))
    return { key: 'recovery-update', ...SIGNAL['recovery-update'] };
  if (subject.includes('DELIVERY') || subject.includes('ACK'))
    return { key: 'delivery', ...SIGNAL.delivery };
  return { key: 'note', ...SIGNAL.note };
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** A calm gradient across the four status tones — the badge label carries the word. */
const SEVERITY_TONE: Record<Severity, Tone> = {
  critical: 'danger',
  high: 'warn',
  medium: 'info',
  low: 'neutral',
};

export function severityTone(s: Severity): Tone {
  return SEVERITY_TONE[s];
}

/**
 * Grade a message's urgency. `gt escalate -s HIGH` stamps the level into the
 * subject; we read that first, then fall back to the mail priority so a message
 * is never left ungraded.
 */
export function severity(mail: MailMessage): Severity {
  const subject = subjectOf(mail);
  if (subject.includes('CRITICAL')) return 'critical';
  if (subject.includes('HIGH')) return 'high';
  if (subject.includes('MEDIUM')) return 'medium';
  if (subject.includes('LOW')) return 'low';

  const priority = String(mail?.priority ?? '').toLowerCase();
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  return 'medium';
}

/** An escalation is a message the operator is expected to authorize or clear. */
export function isEscalation(mail: MailMessage): boolean {
  return subjectOf(mail).includes('ESCALATION');
}

function time(mail: MailMessage): number {
  const t = new Date(mail?.timestamp ?? 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Inbox order: unread before read, then newest first. The dedicated escalations
 * surface owns urgency ranking; the inbox stays a predictable chronological
 * record so nothing the operator already triaged jumps back to the top.
 */
export function compareInbox(a: MailMessage, b: MailMessage): number {
  if (a.read !== b.read) return a.read ? 1 : -1;
  return time(b) - time(a);
}

/** Escalation triage order: severity, then unread, then newest. */
export function compareEscalations(a: MailMessage, b: MailMessage): number {
  const bySeverity = SEVERITY_RANK[severity(a)] - SEVERITY_RANK[severity(b)];
  if (bySeverity !== 0) return bySeverity;
  if (a.read !== b.read) return a.read ? 1 : -1;
  return time(b) - time(a);
}

/** Pull escalations out of the inbox, triage-sorted. */
export function escalationsOf(mail: MailMessage[]): MailMessage[] {
  return mail.filter(isEscalation).sort(compareEscalations);
}

/** Body text, normalized across the two field names the bridge may use. */
export function mailBody(mail: MailMessage): string {
  return (mail.message ?? mail.body ?? '').trim();
}
