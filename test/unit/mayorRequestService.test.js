import { describe, expect, it } from 'vitest';

import { MayorRequestService } from '../../server/services/MayorRequestService.js';

describe('MayorRequestService', () => {
  it('parses bullet prompts into multiple bead creations and dispatches them', async () => {
    const created = [];
    const slung = [];
    const service = new MayorRequestService({
      beadService: {
        create: async (payload) => {
          created.push(payload);
          return { ok: true, beadId: `gg-${created.length}` };
        },
      },
      workService: {
        sling: async (payload) => {
          slung.push(payload);
          return { ok: true, data: { bead: payload.bead, target: payload.target ?? null } };
        },
      },
    });

    const result = await service.submit({
      prompt: '- Fix the dispatch surface -> gastown_gui\n- Add tests for the mayor route',
      molecule: 'mol-polecat-work',
      args: 'base_branch=master',
    });

    expect(result.ok).toBe(true);
    expect(result.data.status).toBe('ok');
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({
      title: 'Fix the dispatch surface',
      labels: ['mayor-request', 'operator-request'],
    });
    expect(slung).toEqual([
      { bead: 'gg-1', target: 'gastown_gui', molecule: 'mol-polecat-work', args: 'base_branch=master' },
      { bead: 'gg-2', target: undefined, molecule: 'mol-polecat-work', args: 'base_branch=master' },
    ]);
  });

  it('returns a partial result when dispatch fails after bead creation', async () => {
    const service = new MayorRequestService({
      beadService: {
        create: async () => ({ ok: true, beadId: 'gg-9' }),
      },
      workService: {
        sling: async () => ({ ok: false, body: { error: 'formula missing' } }),
      },
    });

    const result = await service.submit({ prompt: 'Build the mayor request workflow.' });
    expect(result.ok).toBe(true);
    expect(result.data.status).toBe('partial');
    expect(result.data.items[0]).toMatchObject({
      beadId: 'gg-9',
      stage: 'dispatch_failed',
      error: 'formula missing',
    });
  });

  it('rejects empty prompts with a typed parse error', async () => {
    const service = new MayorRequestService({
      beadService: { create: async () => ({ ok: true, beadId: 'gg-1' }) },
      workService: { sling: async () => ({ ok: true, data: {} }) },
    });

    const result = await service.submit({ prompt: '   ' });
    expect(result).toMatchObject({
      ok: false,
      statusCode: 400,
      errorType: 'prompt_required',
    });
  });
});
