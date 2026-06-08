import { describe, expect, it } from 'vitest';

import { WorkCreationService } from '../../server/services/WorkCreationService.js';

function createService() {
  const calls = [];
  const created = new Map();

  const beadService = {
    create: async (draft) => {
      calls.push(['bead.create', draft]);
      const id = `gg-${calls.length}`;
      created.set(id, {
        id,
        title: draft.title,
        description: draft.description,
        priority: 2,
        status: 'open',
      });
      return { ok: true, beadId: id };
    },
    get: async (id) => ({ ok: true, bead: created.get(id) }),
  };

  const convoyService = {
    create: async (opts) => {
      calls.push(['convoy.create', opts]);
      return { ok: true, convoyId: 'hq-123' };
    },
    get: async (id) => ({
      id,
      title: 'Work: Release train',
      total: 2,
      completed: 0,
    }),
  };

  const workService = {
    sling: async (opts) => {
      calls.push(['work.sling', opts]);
      return { ok: true, data: { bead: opts.bead, target: opts.target || null } };
    },
  };

  return {
    calls,
    service: new WorkCreationService({ beadService, convoyService, workService }),
  };
}

describe('WorkCreationService', () => {
  it('creates and slings a single bead workflow', async () => {
    const { service, calls } = createService();

    const result = await service.create({
      mode: 'single',
      bead: { title: 'Fix dispatch', description: 'Tighten flow', labels: 'bug, ux' },
      dispatch: { sling: true, target: 'gastown_gui/polecats/jasper' },
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      mode: 'single',
      outcome: 'slung',
      bead: {
        title: 'Fix dispatch',
        workflow_state: 'slung',
        dispatch: { ok: true, target: 'gastown_gui/polecats/jasper' },
      },
    });
    expect(calls).toEqual([
      ['bead.create', { title: 'Fix dispatch', description: 'Tighten flow', priority: 'normal', labels: ['bug', 'ux'] }],
      ['work.sling', { bead: 'gg-1', target: 'gastown_gui/polecats/jasper', molecule: undefined, args: undefined }],
    ]);
  });

  it('creates a convoy with multiple beads and dispatches all when requested', async () => {
    const { service, calls } = createService();

    const result = await service.create({
      mode: 'convoy',
      convoy: { name: 'Release train', notify: 'mayor/' },
      beads: [
        { title: 'Cut bead A' },
        { title: 'Cut bead B', labels: ['ops'] },
      ],
      dispatch: { mode: 'all', target: 'gastown_gui/polecats/jasper' },
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      mode: 'convoy',
      outcome: 'slung',
      convoy: { id: 'hq-123', title: 'Work: Release train', total: 2 },
    });
    expect(result.data.beads).toHaveLength(2);
    expect(result.data.beads.every((bead) => bead.workflow_state === 'slung')).toBe(true);
    expect(calls[2]).toEqual([
      'convoy.create',
      { name: 'Release train', issues: ['gg-1', 'gg-2'], notify: 'mayor/' },
    ]);
    expect(calls.slice(3)).toEqual([
      ['work.sling', { bead: 'gg-1', target: 'gastown_gui/polecats/jasper', molecule: undefined, args: undefined }],
      ['work.sling', { bead: 'gg-2', target: 'gastown_gui/polecats/jasper', molecule: undefined, args: undefined }],
    ]);
  });

  it('returns partial outcome when dispatch fails after creation', async () => {
    const { calls } = createService();
    const beadService = {
      create: async () => ({ ok: true, beadId: 'gg-1' }),
      get: async () => ({ ok: true, bead: { id: 'gg-1', title: 'Dispatch fail', status: 'open' } }),
    };
    const convoyService = {
      create: async () => ({ ok: true, convoyId: 'hq-1' }),
      get: async () => ({ id: 'hq-1', title: 'Work: x', total: 1, completed: 0 }),
    };
    const workService = {
      sling: async (opts) => {
        calls.push(['work.sling', opts]);
        return { ok: false, body: { error: 'Target offline' } };
      },
    };

    const service = new WorkCreationService({ beadService, convoyService, workService });
    const result = await service.create({
      mode: 'single',
      bead: { title: 'Dispatch fail' },
      dispatch: { sling: true, target: 'offline/agent' },
    });

    expect(result.ok).toBe(true);
    expect(result.data.outcome).toBe('partial');
    expect(result.data.bead.dispatch).toEqual({ ok: false, target: 'offline/agent', error: 'Target offline' });
    expect(result.data.bead.workflow_state).toBe('dispatch_failed');
  });
});
