import { describe, expect, it } from 'vitest';
import {
  byUrgency,
  prReview,
  priorityLabel,
  priorityTone,
  statusLabel,
  statusTone,
} from './catalogMeta';
import type { Bead } from '@/lib/api/types';

describe('priorityLabel', () => {
  it('formats numeric priorities and clamps to the P0–P4 band', () => {
    expect(priorityLabel(0)).toBe('P0');
    expect(priorityLabel(2)).toBe('P2');
    expect(priorityLabel(9)).toBe('P4');
  });

  it('degrades gracefully for missing priority', () => {
    expect(priorityLabel(undefined)).toBe('P—');
  });
});

describe('priorityTone', () => {
  it('gets louder as priority climbs in urgency', () => {
    expect(priorityTone(0)).toBe('danger');
    expect(priorityTone(1)).toBe('warn');
    expect(priorityTone(2)).toBe('info');
    expect(priorityTone(4)).toBe('neutral');
  });
});

describe('statusTone / statusLabel', () => {
  it('accents active work and humanizes the label', () => {
    expect(statusTone('in_progress')).toBe('accent');
    expect(statusLabel('in_progress')).toBe('in progress');
    expect(statusTone('blocked')).toBe('warn');
    expect(statusTone('closed')).toBe('ok');
  });
});

describe('prReview', () => {
  it('lets draft win over a review decision', () => {
    expect(prReview({ isDraft: true, reviewDecision: 'APPROVED' })).toEqual({
      label: 'draft',
      tone: 'neutral',
    });
  });

  it('maps review decisions to tones', () => {
    expect(prReview({ isDraft: false, reviewDecision: 'APPROVED' }).tone).toBe('ok');
    expect(prReview({ isDraft: false, reviewDecision: 'CHANGES_REQUESTED' }).tone).toBe('danger');
    expect(prReview({ isDraft: false, reviewDecision: '' }).label).toBe('open');
  });
});

describe('byUrgency', () => {
  it('orders by priority, then most recently updated', () => {
    const beads: Bead[] = [
      { id: 'a', title: 'a', status: 'open', priority: 2, updated_at: '2026-06-01T00:00:00Z' },
      { id: 'b', title: 'b', status: 'open', priority: 0, updated_at: '2026-06-01T00:00:00Z' },
      { id: 'c', title: 'c', status: 'open', priority: 2, updated_at: '2026-06-05T00:00:00Z' },
    ];
    const sorted = [...beads].sort(byUrgency).map((b) => b.id);
    expect(sorted).toEqual(['b', 'c', 'a']);
  });
});
