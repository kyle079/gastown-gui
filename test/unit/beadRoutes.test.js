import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createServer } from 'node:http';

import { createApp } from '../../server/app/createApp.js';
import { registerBeadRoutes } from '../../server/routes/beads.js';

describe('Bead routes (real Express app)', () => {
  let server;
  let baseUrl;
  let calls;

  beforeAll(async () => {
    calls = [];
    const beadService = {
      list: async (opts) => {
        calls.push(['list', opts]);
        return [{ id: 'bead-1' }];
      },
      search: async (query) => {
        calls.push(['search', query]);
        return [{ id: 'bead-2' }];
      },
      create: async (opts) => {
        calls.push(['create', opts]);
        if (!opts.title) return { ok: false, statusCode: 400, error: 'Title is required' };
        return { ok: true, beadId: 'bead-xyz', raw: 'Created bead: bead-xyz' };
      },
      get: async (beadId) => {
        calls.push(['get', beadId]);
        if (beadId === 'missing') return { ok: false };
        return { ok: true, bead: { id: beadId } };
      },
      appendNotes: async ({ beadId, notes }) => {
        calls.push(['appendNotes', beadId, notes]);
        if (!String(notes || '').trim()) return { ok: false, statusCode: 400, error: 'Notes are required' };
        return { ok: true, raw: 'updated' };
      },
    };

    const app = createApp({ allowedOrigins: ['*'] });
    registerBeadRoutes(app, { beadService });

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /api/beads forwards status', async () => {
    const res = await fetch(`${baseUrl}/api/beads?status=open`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ id: 'bead-1' }]);
    expect(calls[0]).toEqual(['list', { status: 'open' }]);
  });

  it('GET /api/beads/search forwards q', async () => {
    const res = await fetch(`${baseUrl}/api/beads/search?q=login`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ id: 'bead-2' }]);
    expect(calls[1]).toEqual(['search', 'login']);
  });

  it('POST /api/beads returns 400 when title is missing', async () => {
    const res = await fetch(`${baseUrl}/api/beads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ success: false, error: 'Title is required' });
  });

  it('GET /api/bead/:beadId returns 404 when missing', async () => {
    const res = await fetch(`${baseUrl}/api/bead/missing`);
    expect(res.status).toBe(404);
  });

  it('POST /api/bead/:beadId/notes appends notes', async () => {
    const res = await fetch(`${baseUrl}/api/bead/gg-1/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Need more context' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, beadId: 'gg-1', raw: 'updated' });
    expect(calls.at(-1)).toEqual(['appendNotes', 'gg-1', 'Need more context']);
  });
});
