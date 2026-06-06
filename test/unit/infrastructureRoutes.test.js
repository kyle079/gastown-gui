import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { createApp } from '../../server/app/createApp.js';
import { registerInfrastructureRoutes } from '../../server/routes/infrastructure.js';
import { CacheRegistry } from '../../server/infrastructure/CacheRegistry.js';

function makeGateway(overrides = {}) {
  return {
    schedulerStatus: async () => ({ ok: true, data: { paused: false, queued_total: 0, active_polecats: 2, capacity: {} } }),
    dogList: async () => ({ ok: true, data: [{ name: 'alpha', state: 'idle' }] }),
    dogStatus: async () => ({ ok: true, data: { total: 1, idle: 1, working: 0 } }),
    escalationList: async () => ({ ok: true, data: [{ id: 'hq-wisp-abc', title: 'Test escalation', status: 'open' }] }),
    escalationAck: async () => ({ ok: true, raw: 'acked' }),
    escalationClose: async () => ({ ok: true, raw: 'closed' }),
    mqList: async () => ({ ok: true, data: [{ id: 'lo-wisp-abc', title: 'Merge: lo-abc', status: 'open' }] }),
    refineryStatus: async () => ({ ok: true, data: { running: true, rig_name: 'gastown_gui', queue_length: 0 } }),
    witnessStatus: async () => ({ ok: true, data: { running: true, rig_name: 'gastown_gui', monitored_polecats: ['rust'] } }),
    doltHealth: async () => ({ ok: true, data: { timestamp: '2026-01-01T00:00:00Z', server: { running: true }, databases: [] } }),
    changelog: async () => ({ ok: true, data: [{ id: 'gg-abc', title: 'Test work', type: 'task', rig: 'gastown_gui' }] }),
    rigList: async () => ({ ok: true, data: [{ name: 'gastown_gui', status: 'operational' }] }),
    ...overrides,
  };
}

describe('Infrastructure routes', () => {
  let server;
  let baseUrl;
  let cache;

  beforeAll(async () => {
    const app = createApp({ allowedOrigins: ['*'] });
    cache = new CacheRegistry();
    registerInfrastructureRoutes(app, { gtGateway: makeGateway(), cache });

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /api/scheduler/status returns scheduler JSON', async () => {
    const res = await fetch(`${baseUrl}/api/scheduler/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ paused: false, active_polecats: 2 });
  });

  it('GET /api/dogs returns dogs + summary', async () => {
    const res = await fetch(`${baseUrl}/api/dogs`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.dogs).toHaveLength(1);
    expect(data.dogs[0].name).toBe('alpha');
    expect(data.summary).toMatchObject({ total: 1 });
  });

  it('GET /api/escalations returns escalation list', async () => {
    const res = await fetch(`${baseUrl}/api/escalations`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('hq-wisp-abc');
  });

  it('POST /api/escalations/:id/ack acks and clears cache', async () => {
    cache.set('escalations:list', [{ id: 'hq-wisp-abc' }], 60_000);
    const res = await fetch(`${baseUrl}/api/escalations/hq-wisp-abc/ack`, { method: 'POST' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(cache.get('escalations:list')).toBeUndefined();
  });

  it('POST /api/escalations/:id/close closes and clears cache', async () => {
    cache.set('escalations:list', [{ id: 'hq-wisp-abc' }], 60_000);
    const res = await fetch(`${baseUrl}/api/escalations/hq-wisp-abc/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'fixed' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(cache.get('escalations:list')).toBeUndefined();
  });

  it('GET /api/mq/:rig returns merge queue for rig', async () => {
    const res = await fetch(`${baseUrl}/api/mq/loop`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('lo-wisp-abc');
  });

  it('GET /api/refinery/:rig/status returns refinery status', async () => {
    const res = await fetch(`${baseUrl}/api/refinery/gastown_gui/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.running).toBe(true);
    expect(data.queue_length).toBe(0);
  });

  it('GET /api/witness/:rig/status returns witness status', async () => {
    const res = await fetch(`${baseUrl}/api/witness/gastown_gui/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.running).toBe(true);
    expect(data.monitored_polecats).toContain('rust');
  });

  it('GET /api/dolt/health returns Dolt health', async () => {
    const res = await fetch(`${baseUrl}/api/dolt/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.server.running).toBe(true);
    expect(Array.isArray(data.databases)).toBe(true);
  });

  it('GET /api/changelog returns changelog entries', async () => {
    const res = await fetch(`${baseUrl}/api/changelog`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('gg-abc');
  });

  it('GET /api/rig-list returns rig summaries', async () => {
    const res = await fetch(`${baseUrl}/api/rig-list`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('gastown_gui');
  });

  it('?refresh=true bypasses cache', async () => {
    const calls = [];
    const app2 = createApp({ allowedOrigins: ['*'] });
    const c2 = new CacheRegistry();
    const gw = makeGateway({
      schedulerStatus: async () => {
        calls.push('schedulerStatus');
        return { ok: true, data: { paused: false, active_polecats: 0, queued_total: 0, capacity: {} } };
      },
    });
    registerInfrastructureRoutes(app2, { gtGateway: gw, cache: c2 });
    const s2 = createServer(app2);
    await new Promise((resolve) => s2.listen(0, resolve));
    const base2 = `http://127.0.0.1:${s2.address().port}`;

    // First call populates cache
    await fetch(`${base2}/api/scheduler/status`);
    expect(calls).toHaveLength(1);

    // Second call hits cache
    await fetch(`${base2}/api/scheduler/status`);
    expect(calls).toHaveLength(1);

    // refresh=true bypasses cache
    await fetch(`${base2}/api/scheduler/status?refresh=true`);
    expect(calls).toHaveLength(2);

    await new Promise((resolve) => s2.close(resolve));
  });

  it('returns 500 on gateway error', async () => {
    const app3 = createApp({ allowedOrigins: ['*'] });
    const c3 = new CacheRegistry();
    const errGw = makeGateway({
      doltHealth: async () => { throw new Error('Dolt is down'); },
    });
    registerInfrastructureRoutes(app3, { gtGateway: errGw, cache: c3 });
    const s3 = createServer(app3);
    await new Promise((resolve) => s3.listen(0, resolve));
    const base3 = `http://127.0.0.1:${s3.address().port}`;

    const res = await fetch(`${base3}/api/dolt/health`);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('Dolt is down');

    await new Promise((resolve) => s3.close(resolve));
  });
});
