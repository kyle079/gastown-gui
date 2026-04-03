import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import path from 'node:path';
import os from 'node:os';
import fsPromises from 'node:fs/promises';

import { CacheRegistry } from '../../server/infrastructure/CacheRegistry.js';
import { StatusService } from '../../server/services/StatusService.js';

describe('StatusService', () => {
  let gtRoot;

  beforeAll(async () => {
    gtRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'gastown-status-'));
    await fsPromises.mkdir(path.join(gtRoot, 'mayor'), { recursive: true });
    await fsPromises.mkdir(path.join(gtRoot, 'rig-one'), { recursive: true });
    await fsPromises.writeFile(
      path.join(gtRoot, 'rig-one', 'config.json'),
      JSON.stringify({ git_url: 'https://github.com/example/rig-one' }),
      'utf8',
    );
    await fsPromises.writeFile(
      path.join(gtRoot, 'mayor', 'rigs.json'),
      JSON.stringify({
        rigs: {
          'rig-one': {
            beads: { prefix: 'r1' },
          },
        },
      }),
      'utf8',
    );
  });

  afterAll(async () => {
    await fsPromises.rm(gtRoot, { recursive: true, force: true });
  });

  it('enriches rigs with git_url and hook.running based on current tmux session names', async () => {
    const cache = new CacheRegistry();
    const gtGateway = {
      calls: 0,
      status: async () => {
        gtGateway.calls++;
        return {
          ok: true,
          stdout: '{"rigs":[]}',
          raw: '',
          data: {
            rigs: [
              {
                name: 'rig-one',
                hooks: [
                  { agent: 'rig-one/agent-a', role: 'polecat' },
                  { agent: 'rig-one/witness', role: 'witness' },
                ],
              },
            ],
          },
        };
      },
    };
    const tmuxGateway = {
      listSessions: async () => 'r1-agent-a: 1 windows (created)\nr1-witness: 1 windows\nhq-mayor: 1 windows\n',
    };

    const service = new StatusService({ gtGateway, tmuxGateway, cache, gtRoot });
    const status = await service.getStatus();

    expect(gtGateway.calls).toBe(1);
    expect(status.rigs[0].git_url).toBe('https://github.com/example/rig-one');
    expect(status.rigs[0].hooks[0].running).toBe(true);
    expect(status.rigs[0].hooks[1].running).toBe(true);
    expect(status.runningPolecats).toEqual(['rig-one/agent-a']);
  });

  it('caches status but still refreshes when requested', async () => {
    let now = Date.now();
    const cache = new CacheRegistry({ now: () => now });

    const gtGateway = {
      calls: 0,
      status: async () => {
        gtGateway.calls++;
        return { ok: true, raw: '', data: { rigs: [] } };
      },
    };
    const tmuxGateway = { listSessions: async () => '' };

    const service = new StatusService({ gtGateway, tmuxGateway, cache, gtRoot, statusTtlMs: 1000 });

    await service.getStatus();
    await service.getStatus();
    expect(gtGateway.calls).toBe(1);

    await service.getStatus({ refresh: true });
    expect(gtGateway.calls).toBe(2);

    now += 1001;
    await service.getStatus();
    expect(gtGateway.calls).toBe(3);
  });

  it('derives active hook summary from hook-based rig payloads', async () => {
    const cache = new CacheRegistry();
    const gtGateway = {
      status: async () => ({
        ok: true,
        raw: '',
        data: {
          rigs: [
            {
              name: 'rig-one',
              hooks: [
                { agent: 'rig-one/agent-a', role: 'polecat', hook_bead: 'bd-1' },
                { agent: 'rig-one/agent-b', role: 'polecat' },
              ],
            },
          ],
        },
      }),
    };
    const tmuxGateway = {
      listSessions: async () => 'r1-agent-a: 1 windows (created)\nr1-agent-b: 1 windows (created)\n',
    };

    const service = new StatusService({ gtGateway, tmuxGateway, cache, gtRoot });
    const status = await service.getStatus({ refresh: true });

    expect(status.summary.active_hooks).toBe(1);
    expect(status.summary.rig_count).toBe(1);
  });

  it('keeps rig config cached across status refresh', async () => {
    const cache = new CacheRegistry();

    const gtGateway = {
      calls: 0,
      status: async () => {
        gtGateway.calls++;
        return {
          ok: true,
          raw: '',
          data: {
            rigs: [
              { name: 'rig-one', hooks: [] },
            ],
          },
        };
      },
    };
    const tmuxGateway = { listSessions: async () => '' };

    const service = new StatusService({ gtGateway, tmuxGateway, cache, gtRoot });

    const first = await service.getStatus({ refresh: true });
    expect(first.rigs[0].git_url).toBe('https://github.com/example/rig-one');

    await fsPromises.rm(path.join(gtRoot, 'rig-one', 'config.json'));

    const second = await service.getStatus({ refresh: true });
    expect(second.rigs[0].git_url).toBe('https://github.com/example/rig-one');
  });
});
