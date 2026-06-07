import { describe, expect, it } from 'vitest';
import type { Escalation, MailMessage } from '@/lib/api/types';
import { buildMailQueue, filterMailQueue, queueSummary } from './queueModel';

function mail(overrides: Partial<MailMessage>): MailMessage {
  return {
    id: 'mail-1',
    from: 'gastown_gui/witness',
    subject: 'Note',
    timestamp: '2026-06-07T00:00:00Z',
    read: false,
    priority: 'normal',
    ...overrides,
  };
}

function escalation(overrides: Partial<Escalation>): Escalation {
  return {
    id: 'esc-1',
    title: 'ESCALATION HIGH: Witness blocked',
    status: 'open',
    created_at: '2026-06-07T00:00:00Z',
    created_by: 'mayor/',
    labels: [],
    ...overrides,
  };
}

describe('buildMailQueue', () => {
  it('prefers structured escalations over escalation-shaped mail', () => {
    const items = buildMailQueue(
      [
        mail({ id: 'mail-escalation', subject: 'ESCALATION HIGH: Witness blocked' }),
        mail({ id: 'mail-note', subject: 'FYI', read: true }),
      ],
      [escalation()],
    );

    expect(items.map((item) => item.id)).toEqual(['esc-1', 'mail-note']);
  });

  it('sorts by explicit action state before recency', () => {
    const items = buildMailQueue(
      [
        mail({ id: 'read', read: true, timestamp: '2026-06-07T03:00:00Z' }),
        mail({ id: 'unread', subject: 'FYI', read: false, timestamp: '2026-06-07T02:00:00Z' }),
        mail({ id: 'review', subject: 'RECOVERY_NEEDED', read: false, timestamp: '2026-06-07T01:00:00Z' }),
      ],
      [escalation({ id: 'ack-me', labels: [], created_at: '2026-06-07T00:30:00Z' })],
    );

    expect(items.map((item) => item.id)).toEqual(['ack-me', 'review', 'unread', 'read']);
    expect(items.map((item) => item.actionState)).toEqual(['needs_ack', 'needs_review', 'unread', 'read']);
  });
});

describe('queue filters', () => {
  const items = buildMailQueue(
    [
      mail({ id: 'unread', subject: 'FYI', read: false }),
      mail({ id: 'review', subject: 'RECOVERY_UPDATE', read: false }),
      mail({ id: 'read', read: true }),
    ],
    [escalation({ id: 'acked', labels: ['acked'] })],
  );

  it('filters action items explicitly', () => {
    expect(filterMailQueue(items, 'action').map((item) => item.id)).toEqual(['review']);
  });

  it('summarizes unread and action counts from explicit state', () => {
    expect(queueSummary(items)).toEqual({
      total: 4,
      action: 1,
      unread: 2,
      escalations: 1,
    });
  });
});
