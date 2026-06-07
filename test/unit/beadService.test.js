import { describe, it, expect } from 'vitest';

import { BeadService } from '../../server/services/BeadService.js';
import { CacheRegistry } from '../../server/infrastructure/CacheRegistry.js';

describe('BeadService', () => {
  it('maps UI priorities and emits bead_created', async () => {
    const calls = [];
    const emitted = [];

    const bdGateway = {
      list: async () => ({ ok: true, data: [] }),
      search: async () => ({ ok: true, data: [] }),
      show: async () => ({ ok: false }),
      create: async (opts) => {
        calls.push(opts);
        return { ok: true, beadId: 'gt-abc123', raw: 'Created bead: gt-abc123' };
      },
      update: async () => ({ ok: true, raw: 'updated' }),
    };

    const service = new BeadService({
      bdGateway,
      emit: (type, data) => emitted.push([type, data]),
    });

    const result = await service.create({
      title: 'Fix login',
      description: 'Steps…',
      priority: 'high',
      labels: ['bug', '', ' ui '],
    });

    expect(result.ok).toBe(true);
    expect(calls[0]).toEqual({
      title: 'Fix login',
      description: 'Steps…',
      priority: 'P1',
      labels: ['bug', ' ui '],
    });
    expect(emitted).toEqual([['bead_created', { bead_id: 'gt-abc123', title: 'Fix login' }]]);
  });

  it('omits default/normal priority', async () => {
    const calls = [];
    const bdGateway = {
      list: async () => ({ ok: true, data: [] }),
      search: async () => ({ ok: true, data: [] }),
      show: async () => ({ ok: false }),
      create: async (opts) => {
        calls.push(opts);
        return { ok: true, beadId: 'bead-1', raw: 'Created bead: bead-1' };
      },
      update: async () => ({ ok: true, raw: 'updated' }),
    };

    const service = new BeadService({ bdGateway });
    await service.create({ title: 'T', priority: 'normal' });

    expect(calls[0].priority).toBe(null);
  });

  it('returns ok=false for missing beads', async () => {
    const bdGateway = {
      list: async () => ({ ok: true, data: [] }),
      search: async () => ({ ok: true, data: [] }),
      create: async () => ({ ok: true, beadId: 'bead-1', raw: '' }),
      show: async () => ({ ok: false, error: 'not found' }),
      update: async () => ({ ok: true, raw: 'updated' }),
    };

    const service = new BeadService({ bdGateway });
    await expect(service.get('missing')).resolves.toEqual({ ok: false });
  });

  it('uses direct read gateway for list/get/search/graph and caches results', async () => {
    let listCalls = 0;
    let searchCalls = 0;
    let getCalls = 0;
    let graphCalls = 0;
    const bdGateway = {
      list: async () => ({ ok: true, data: [] }),
      search: async () => ({ ok: true, data: [] }),
      show: async () => ({ ok: false }),
      create: async () => ({ ok: true, beadId: 'bead-1', raw: '' }),
      update: async () => ({ ok: true, raw: 'updated' }),
    };
    const beadsReadGateway = {
      list: async () => {
        listCalls++;
        return [{ id: 'gg-1' }];
      },
      search: async () => {
        searchCalls++;
        return [{ id: 'gg-search' }];
      },
      get: async () => {
        getCalls++;
        return { id: 'gg-2' };
      },
      graph: async () => {
        graphCalls++;
        return { nodes: [{ id: 'gg-1' }], edges: [] };
      },
    };

    const service = new BeadService({
      bdGateway,
      beadsReadGateway,
      cache: new CacheRegistry(),
    });

    await expect(service.list({ status: 'open' })).resolves.toEqual([{ id: 'gg-1' }]);
    await expect(service.list({ status: 'open' })).resolves.toEqual([{ id: 'gg-1' }]);
    await expect(service.search('graph')).resolves.toEqual([{ id: 'gg-search' }]);
    await expect(service.search('graph')).resolves.toEqual([{ id: 'gg-search' }]);
    await expect(service.get('gg-2')).resolves.toEqual({ ok: true, bead: { id: 'gg-2' } });
    await expect(service.get('gg-2')).resolves.toEqual({ ok: true, bead: { id: 'gg-2' } });
    await expect(service.graph()).resolves.toEqual({ nodes: [{ id: 'gg-1' }], edges: [] });
    await expect(service.graph()).resolves.toEqual({ nodes: [{ id: 'gg-1' }], edges: [] });

    expect(listCalls).toBe(1);
    expect(searchCalls).toBe(1);
    expect(getCalls).toBe(1);
    expect(graphCalls).toBe(1);
  });

  it('falls back to bd CLI reads when direct Dolt reads fail', async () => {
    const bdGateway = {
      list: async () => ({ ok: true, data: [{ id: 'cli-list' }] }),
      search: async () => ({ ok: true, data: [{ id: 'cli-search' }] }),
      show: async () => ({ ok: true, data: [{ id: 'cli-get' }] }),
      listAll: async () => ({
        ok: true,
        data: [{
          id: 'cli-graph',
          title: 'CLI graph',
          status: 'open',
          priority: 1,
          issue_type: 'task',
          dependencies: [{ depends_on_id: 'dep-1', issue_id: 'cli-graph', type: 'blocks' }],
        }],
      }),
      create: async () => ({ ok: true, beadId: 'bead-1', raw: '' }),
      update: async () => ({ ok: true, raw: 'updated' }),
    };
    const beadsReadGateway = {
      list: async () => { throw new Error('dolt down'); },
      search: async () => { throw new Error('dolt down'); },
      get: async () => { throw new Error('dolt down'); },
      graph: async () => { throw new Error('dolt down'); },
    };

    const service = new BeadService({ bdGateway, beadsReadGateway });

    await expect(service.list()).resolves.toEqual([{ id: 'cli-list' }]);
    await expect(service.search('x')).resolves.toEqual([{ id: 'cli-search' }]);
    await expect(service.get('x')).resolves.toEqual({ ok: true, bead: { id: 'cli-get' } });
    await expect(service.graph()).resolves.toEqual({
      nodes: [{
        id: 'cli-graph',
        title: 'CLI graph',
        status: 'open',
        priority: 1,
        issue_type: 'task',
        rig: 'cli',
      }],
      edges: [{
        id: 'dep-1→cli-graph:blocks',
        source: 'dep-1',
        target: 'cli-graph',
        type: 'blocks',
      }],
    });
  });
});
