import { describe, expect, it } from 'vitest';
import type { MailMessage } from '@/lib/api/types';
import {
  compareEscalations,
  compareInbox,
  escalationsOf,
  isEscalation,
  mailBody,
  mailSignal,
  severity,
} from './mailSignal';

function msg(overrides: Partial<MailMessage>): MailMessage {
  return {
    id: 'm1',
    from: 'gastown/polecats/x',
    subject: '',
    timestamp: '2026-06-05T00:00:00Z',
    read: false,
    priority: 'normal',
    ...overrides,
  };
}

describe('mailSignal', () => {
  it('classifies escalations and crashes as top-rank danger', () => {
    expect(mailSignal(msg({ subject: 'ESCALATION: Dolt unreachable' })).key).toBe('escalation');
    expect(mailSignal(msg({ subject: 'CRASHED_POLECAT rust' })).key).toBe('crash');
    expect(mailSignal(msg({ subject: 'ESCALATION x' })).rank).toBe(0);
    expect(mailSignal(msg({ subject: 'ESCALATION x' })).tone).toBe('danger');
  });

  it('falls back to a calm note for ordinary mail', () => {
    const sig = mailSignal(msg({ subject: 'progress update' }));
    expect(sig.key).toBe('note');
    expect(sig.tone).toBe('neutral');
    expect(sig.rank).toBe(2);
  });

  it('is case-insensitive on the subject', () => {
    expect(mailSignal(msg({ subject: 'escalation: foo' })).key).toBe('escalation');
  });
});

describe('severity', () => {
  it('reads the level out of the subject first', () => {
    expect(severity(msg({ subject: 'ESCALATION CRITICAL: outage' }))).toBe('critical');
    expect(severity(msg({ subject: 'ESCALATION HIGH: dolt' }))).toBe('high');
    expect(severity(msg({ subject: 'ESCALATION LOW: fyi' }))).toBe('low');
  });

  it('falls back to priority when the subject is unmarked', () => {
    expect(severity(msg({ subject: 'ESCALATION: x', priority: 'high' }))).toBe('high');
    expect(severity(msg({ subject: 'ESCALATION: x', priority: 'low' }))).toBe('low');
    expect(severity(msg({ subject: 'ESCALATION: x', priority: 'normal' }))).toBe('medium');
  });
});

describe('isEscalation / escalationsOf', () => {
  it('selects only escalation-subject mail', () => {
    const list = [
      msg({ id: 'a', subject: 'ESCALATION HIGH: dolt' }),
      msg({ id: 'b', subject: 'just a note' }),
      msg({ id: 'c', subject: 'ESCALATION CRITICAL: outage' }),
    ];
    expect(list.filter(isEscalation).map((m) => m.id)).toEqual(['a', 'c']);
    // Critical sorts ahead of high.
    expect(escalationsOf(list).map((m) => m.id)).toEqual(['c', 'a']);
  });
});

describe('compareEscalations', () => {
  it('orders by severity, then unread, then newest', () => {
    const critical = msg({ id: 'crit', subject: 'ESCALATION CRITICAL' });
    const highUnread = msg({ id: 'hi-u', subject: 'ESCALATION HIGH', read: false });
    const highRead = msg({ id: 'hi-r', subject: 'ESCALATION HIGH', read: true });
    const sorted = [highRead, highUnread, critical].sort(compareEscalations);
    expect(sorted.map((m) => m.id)).toEqual(['crit', 'hi-u', 'hi-r']);
  });
});

describe('compareInbox', () => {
  it('puts unread first, then newest', () => {
    const a = msg({ id: 'old-unread', timestamp: '2026-06-01T00:00:00Z', read: false });
    const b = msg({ id: 'new-unread', timestamp: '2026-06-05T00:00:00Z', read: false });
    const c = msg({ id: 'new-read', timestamp: '2026-06-06T00:00:00Z', read: true });
    expect([c, a, b].sort(compareInbox).map((m) => m.id)).toEqual([
      'new-unread',
      'old-unread',
      'new-read',
    ]);
  });
});

describe('mailBody', () => {
  it('prefers message, falls back to body, trims', () => {
    expect(mailBody(msg({ message: '  hello  ' }))).toBe('hello');
    expect(mailBody(msg({ body: 'from body' }))).toBe('from body');
    expect(mailBody(msg({}))).toBe('');
  });
});
