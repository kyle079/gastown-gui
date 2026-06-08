import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';

import { createApp } from '../../server/app/createApp.js';
import { registerMayorRoutes } from '../../server/routes/mayor.js';

describe('Mayor routes', () => {
  let server;
  let baseUrl;
  let calls;

  beforeAll(async () => {
    calls = [];
    const mayorRequestService = {
      submit: async (payload) => {
        calls.push(payload);
        if (!payload.prompt?.trim()) {
          return { ok: false, statusCode: 400, error: 'Prompt is required', errorType: 'prompt_required' };
        }

        return {
          ok: true,
          data: {
            status: 'ok',
            prompt: payload.prompt,
            target: payload.target ?? null,
            molecule: payload.molecule ?? null,
            args: payload.args ?? null,
            summary: { created: 1, dispatched: 1, failed: 0 },
            items: [{ beadId: 'gg-1', title: 'Do the thing', target: payload.target ?? null, stage: 'dispatched' }],
          },
        };
      },
    };

    const app = createApp({ allowedOrigins: ['*'] });
    registerMayorRoutes(app, { mayorRequestService });

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('POST /api/mayor/requests forwards the prompt contract', async () => {
    const res = await fetch(`${baseUrl}/api/mayor/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Create a bead and dispatch it',
        target: 'gastown_gui',
        molecule: 'mol-polecat-work',
        args: 'base_branch=master',
      }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      status: 'ok',
      summary: { created: 1, dispatched: 1, failed: 0 },
    });
    expect(calls[0]).toEqual({
      prompt: 'Create a bead and dispatch it',
      target: 'gastown_gui',
      molecule: 'mol-polecat-work',
      args: 'base_branch=master',
    });
  });

  it('returns a typed 400 for missing prompts', async () => {
    const res = await fetch(`${baseUrl}/api/mayor/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: ' ' }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'Prompt is required',
      errorType: 'prompt_required',
    });
  });
});
