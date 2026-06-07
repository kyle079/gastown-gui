import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createServer } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fsPromises from 'node:fs/promises';

import { createApp } from '../../server/app/createApp.js';
import { CacheRegistry } from '../../server/infrastructure/CacheRegistry.js';
import { FormulaService } from '../../server/services/FormulaService.js';
import { registerFormulaRoutes } from '../../server/routes/formulas.js';

describe('Formula routes (real Express app)', () => {
  let server;
  let baseUrl;
  let formulasDir;

  beforeAll(async () => {
    formulasDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'gastown-formulas-'));

    const cache = new CacheRegistry();
    const events = [];

    const formulaService = new FormulaService({
      gtGateway: { exec: async () => ({ ok: false, stdout: '', error: 'gt disabled in test' }) },
      bdGateway: { exec: async () => ({ ok: false, stdout: '', error: 'bd disabled in test' }) },
      cache,
      formulasDir,
      emit: (type, data) => events.push({ type, data }),
    });

    const app = createApp({ allowedOrigins: ['*'] });
    registerFormulaRoutes(app, { formulaService });

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fsPromises.rm(formulasDir, { recursive: true, force: true });
  });

  it('PUT /api/formula/:name returns 400 when template missing', async () => {
    const res = await fetch(`${baseUrl}/api/formula/foo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'x' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('PUT /api/formula/:name returns 404 when file missing', async () => {
    const res = await fetch(`${baseUrl}/api/formula/missing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'hi' }),
    });

    expect(res.status).toBe(404);
  });

  it('PUT /api/formula/:name updates existing TOML file', async () => {
    const name = 'test-formula';
    const filePath = path.join(formulasDir, `${name}.toml`);
    await fsPromises.writeFile(filePath, '[formula]\nname="test-formula"\n', 'utf8');

    const res = await fetch(`${baseUrl}/api/formula/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'desc', template: 'hello' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const content = await fsPromises.readFile(filePath, 'utf8');
    expect(content).toContain('name = "test-formula"');
    expect(content).toContain('description = "desc"');
    expect(content).toContain('template = """');
    expect(content).toContain('hello');
  });

  it('DELETE /api/formula/:name deletes existing TOML file', async () => {
    const name = 'delete-me';
    const filePath = path.join(formulasDir, `${name}.toml`);
    await fsPromises.writeFile(filePath, 'x', 'utf8');

    const res = await fetch(`${baseUrl}/api/formula/${name}`, { method: 'DELETE' });
    expect(res.status).toBe(200);

    await expect(fsPromises.access(filePath)).rejects.toBeTruthy();
  });
});

