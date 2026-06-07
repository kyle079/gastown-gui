import { describe, it, expect } from 'vitest';

import { BeadsReadGateway } from '../../server/gateways/BeadsReadGateway.js';

class FakeClient {
  constructor(responses = []) {
    this.responses = responses;
    this.calls = [];
  }

  async query(sql, params) {
    this.calls.push({ sql, params });
    const next = this.responses.shift();
    if (next instanceof Error) throw next;
    return [next ?? []];
  }
}

describe('BeadsReadGateway', () => {
  it('lists beads from structured Dolt rows', async () => {
    const client = new FakeClient([[
      {
        id: 'gg-1',
        title: 'Graph bug',
        description: 'Fix it',
        status: 'open',
        priority: '1',
        issue_type: 'bug',
        owner: 'mayor',
        assignee: 'gastown_gui/polecats/jasper',
        labels_json: '["ui","graph"]',
        created_at: '2026-06-07 20:00:00',
        created_by: 'mayor',
        updated_at: '2026-06-07 21:00:00',
        dependency_count: '2',
        dependent_count: '1',
        comment_count: '3',
      },
    ]]);

    const gateway = new BeadsReadGateway({ client });
    const beads = await gateway.list({ status: 'open' });

    expect(beads).toEqual([{
      id: 'gg-1',
      title: 'Graph bug',
      description: 'Fix it',
      status: 'open',
      priority: 1,
      issue_type: 'bug',
      owner: 'mayor',
      assignee: 'gastown_gui/polecats/jasper',
      labels: ['ui', 'graph'],
      created_at: '2026-06-07 20:00:00Z',
      created_by: 'mayor',
      updated_at: '2026-06-07 21:00:00Z',
      dependency_count: 2,
      dependent_count: 1,
      comment_count: 3,
    }]);
    expect(client.calls[0].params).toEqual(['open']);
  });

  it('returns bead detail with dependencies', async () => {
    const client = new FakeClient([
      [{
        id: 'gg-2',
        title: 'Detail',
        description: '',
        status: 'hooked',
        priority: '0',
        issue_type: 'task',
        owner: '',
        assignee: null,
        labels_json: ['operator'],
        created_at: '2026-06-07 20:00:00',
        created_by: '',
        updated_at: '2026-06-07 20:30:00',
        dependency_count: '1',
        dependent_count: '0',
        comment_count: '0',
      }],
      [{
        id: 'gg-1',
        title: 'Prereq',
        description: 'Needed first',
        status: 'closed',
        priority: '2',
        issue_type: 'task',
        created_at: '2026-06-07 19:00:00',
        updated_at: '2026-06-07 19:30:00',
        ephemeral: '0',
        dependency_type: 'blocks',
      }],
    ]);

    const gateway = new BeadsReadGateway({ client });
    const bead = await gateway.get('gg-2');

    expect(bead?.id).toBe('gg-2');
    expect(bead?.labels).toEqual(['operator']);
    expect(bead?.dependencies).toEqual([{
      id: 'gg-1',
      title: 'Prereq',
      description: 'Needed first',
      status: 'closed',
      priority: 2,
      issue_type: 'task',
      created_at: '2026-06-07 19:00:00Z',
      updated_at: '2026-06-07 19:30:00Z',
      ephemeral: false,
      dependency_type: 'blocks',
    }]);
  });

  it('builds graph nodes and edges directly from Dolt rows', async () => {
    const client = new FakeClient([
      [
        { id: 'gg-1', title: 'One', status: 'open', priority: '1', issue_type: 'task' },
        { id: 'gg-2', title: 'Two', status: 'blocked', priority: '2', issue_type: 'bug' },
      ],
      [
        { source: 'gg-1', target: 'gg-2', type: 'blocks' },
      ],
    ]);

    const gateway = new BeadsReadGateway({ client });
    const graph = await gateway.graph();

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([{
      id: 'gg-1→gg-2:blocks',
      source: 'gg-1',
      target: 'gg-2',
      type: 'blocks',
    }]);
  });
});
