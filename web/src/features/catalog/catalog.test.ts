import { describe, it, expect } from 'vitest';
import {
  filterBeads,
  filterFormulas,
  filterPullRequests,
  formulaTypes,
  priorityMeta,
  statusTone,
} from './catalog';
import type { Bead, Formula, PullRequest } from '@/lib/api/types';

function bead(partial: Partial<Bead>): Bead {
  return {
    id: 'gg-1',
    title: 'Title',
    status: 'open',
    priority: 2,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...partial,
  };
}

function pr(partial: Partial<PullRequest>): PullRequest {
  return {
    number: 1,
    title: 'PR',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    url: 'https://example.com',
    headRefName: 'branch',
    state: 'OPEN',
    isDraft: false,
    ...partial,
  };
}

describe('filterBeads', () => {
  it('sorts by priority first, then most recently updated', () => {
    const beads = [
      bead({ id: 'a', priority: 2, updated_at: '2026-06-01T00:00:00Z' }),
      bead({ id: 'b', priority: 0, updated_at: '2026-06-01T00:00:00Z' }),
      bead({ id: 'c', priority: 2, updated_at: '2026-06-03T00:00:00Z' }),
    ];
    expect(filterBeads(beads, '').map((b) => b.id)).toEqual(['b', 'c', 'a']);
  });

  it('treats a missing priority as lowest rank', () => {
    const beads = [
      bead({ id: 'a', priority: undefined as unknown as number }),
      bead({ id: 'b', priority: 1 }),
    ];
    expect(filterBeads(beads, '').map((b) => b.id)).toEqual(['b', 'a']);
  });

  it('matches id, title, owner, type and description case-insensitively', () => {
    const beads = [
      bead({ id: 'gg-xss', title: 'Sanitize output' }),
      bead({ id: 'gg-2', title: 'Other', owner: 'rust@example.com' }),
      bead({ id: 'gg-3', title: 'Third', description: 'mentions Dolt' }),
    ];
    expect(filterBeads(beads, 'xss').map((b) => b.id)).toEqual(['gg-xss']);
    expect(filterBeads(beads, 'RUST').map((b) => b.id)).toEqual(['gg-2']);
    expect(filterBeads(beads, 'dolt').map((b) => b.id)).toEqual(['gg-3']);
  });
});

describe('filterPullRequests', () => {
  it('matches number, branch and author, newest first', () => {
    const prs = [
      pr({ number: 7, headRefName: 'feat/x', updatedAt: '2026-06-01T00:00:00Z' }),
      pr({ number: 8, author: { login: 'kyle' }, updatedAt: '2026-06-05T00:00:00Z' }),
    ];
    expect(filterPullRequests(prs, '').map((p) => p.number)).toEqual([8, 7]);
    expect(filterPullRequests(prs, '#7').map((p) => p.number)).toEqual([7]);
    expect(filterPullRequests(prs, 'kyle').map((p) => p.number)).toEqual([8]);
  });
});

describe('filterFormulas', () => {
  const formulas: Formula[] = [
    { name: 'code-review', type: 'convoy', description: 'review' },
    { name: 'beads-release', type: 'workflow', description: 'release' },
    { name: 'design', type: 'convoy' },
  ];

  it('filters by type and sorts by name', () => {
    expect(filterFormulas(formulas, '', 'convoy').map((f) => f.name)).toEqual([
      'code-review',
      'design',
    ]);
  });

  it('filters by free-text query across name and description', () => {
    expect(filterFormulas(formulas, 'release', '').map((f) => f.name)).toEqual(['beads-release']);
  });

  it('formulaTypes returns distinct sorted types', () => {
    expect(formulaTypes(formulas)).toEqual(['convoy', 'workflow']);
  });
});

describe('priorityMeta / statusTone', () => {
  it('maps priorities to labels and tones', () => {
    expect(priorityMeta(0)).toEqual({ label: 'P0', tone: 'danger' });
    expect(priorityMeta(2)).toEqual({ label: 'P2', tone: 'neutral' });
    expect(priorityMeta(undefined)).toEqual({ label: '—', tone: 'neutral' });
  });

  it('maps statuses to tones', () => {
    expect(statusTone('blocked')).toBe('danger');
    expect(statusTone('open')).toBe('info');
    expect(statusTone('closed')).toBe('neutral');
  });
});
