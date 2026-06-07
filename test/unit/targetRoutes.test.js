import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createServer } from 'node:http';

import { createApp } from '../../server/app/createApp.js';
import { registerTargetRoutes } from '../../server/routes/targets.js';

describe('Target routes (real Express app)', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const calls = [];
    const targetService = {
      list: async (options) => {
        calls.push(options);
        return [{ id: 'mayor' }];
      },
    };

    const { app } = createApp({ allowedOrigins: ['*'] });
    registerTargetRoutes(app, { targetService });

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    server.__calls = calls;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /api/targets returns targets JSON', async () => {
    const res = await fetch(`${baseUrl}/api/targets`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ id: 'mayor' }]);
    expect(server.__calls).toEqual([{ refresh: false }]);
  });

  it('GET /api/targets?refresh=true passes refresh=true to service', async () => {
    const res = await fetch(`${baseUrl}/api/targets?refresh=true`);
    expect(res.status).toBe(200);
    expect(server.__calls).toEqual([{ refresh: false }, { refresh: true }]);
  });
});

