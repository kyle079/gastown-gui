import { describe, it, expect } from 'vitest';
import type { MailMessage } from '@/lib/api/types';
import {
  isEscalation,
  mailBody,
  mailSignal,
  severityOf,
  sortEscalations,
  sortInbox,
} from './mailSignal';

function msg(over: Partial<MailMessage>): MailMessage {
  return {
    id: 'm1',
    from: 'gastown_gui/polecats/rust',
    subject: 'hi',
    timestamp: '2026-06-05T12:00:00Z',
    read: false,
    priority: 'normal',
    ...over,
  };
}

describe('mailSignal', () => {
  it('classifies escalations from the subject (case-insensitive)', () => {
    expect(mailSignal({ subject: 'ESCALATION [HIGH]: Dolt down' }).key).toBe('escalation');
    expect(mailSignal({ subject: 'escalation: help' }).key).toBe('escalation');
    expect(isEscalation({ subject: 'Re: escalation thread' })).toBe(true);
  });

  it('classifies crashes and recovery', () => {
    expect(mailSignal({ subject: 'CRASHED_POLECAT guzzle' }).key).toBe('crash');
    expect(mailSignal({ subject: 'RECOVERY_NEEDED' }).key).toBe('recovery');
    expect(mailSignal({ subject: 'RECOVERY_UPDATE' }).key).toBe('recovery');
  });

  it('falls back to a plain note', () => {
    expect(mailSignal({ subject: 'lunch?' }).key).toBe('note');
    expect(isEscalation({ subject: 'lunch?' })).toBe(false);
  });
});

describe('severityOf', () => {
  it('reads severity from the subject', () => {
    expect(severityOf({ subject: 'ESCALATION [CRITICAL]: outage', priority: 'normal' })).toBe('CRITICAL');
    expect(severityOf({ subject: 'ESCALATION HIGH', priority: 'normal' })).toBe('HIGH');
    expect(severityOf({ subject: 'ESCALATION LOW noise', priority: 'normal' })).toBe('LOW');
  });

  it('falls back to MEDIUM when unstated', () => {
    expect(severityOf({ subject: 'ESCALATION: hmm', priority: 'normal' })).toBe('MEDIUM');
  });

  it('takes the most severe token', () => {
    expect(severityOf({ subject: 'HIGH and CRITICAL', priority: 'low' })).toBe('CRITICAL');
  });
});

describe('mailBody', () => {
  it('prefers message, falls back to body', () => {
    expect(mailBody({ message: 'a', body: 'b' })).toBe('a');
    expect(mailBody({ body: 'b' })).toBe('b');
    expect(mailBody({})).toBe('');
  });
});

describe('sorting', () => {
  it('sorts inbox unread-first then newest', () => {
    const older = msg({ id: 'old', read: false, timestamp: '2026-06-01T00:00:00Z' });
    const newer = msg({ id: 'new', read: false, timestamp: '2026-06-05T00:00:00Z' });
    const readNew = msg({ id: 'read', read: true, timestamp: '2026-06-06T00:00:00Z' });
    const order = sortInbox([readNew, older, newer]).map((m) => m.id);
    expect(order).toEqual(['new', 'old', 'read']);
  });

  it('sorts escalations by severity then newest', () => {
    const med = msg({ id: 'med', subject: 'ESCALATION: x', timestamp: '2026-06-06T00:00:00Z' });
    const crit = msg({ id: 'crit', subject: 'ESCALATION CRITICAL', timestamp: '2026-06-01T00:00:00Z' });
    const highOld = msg({ id: 'hOld', subject: 'ESCALATION HIGH', timestamp: '2026-06-01T00:00:00Z' });
    const highNew = msg({ id: 'hNew', subject: 'ESCALATION HIGH', timestamp: '2026-06-05T00:00:00Z' });
    const order = sortEscalations([med, crit, highOld, highNew]).map((m) => m.id);
    expect(order).toEqual(['crit', 'hNew', 'hOld', 'med']);
  });
});
