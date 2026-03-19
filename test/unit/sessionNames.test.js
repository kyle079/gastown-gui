import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import path from 'node:path';
import os from 'node:os';
import fsPromises from 'node:fs/promises';

import {
  buildSessionRegistryFromTown,
  clearSessionRegistryCache,
  mayorSessionName,
  parseSessionName,
  parseTmuxSessions,
  runningAddressesFromTmux,
  sessionNameForAgentAddress,
  sessionNameForService,
} from '../../server/domain/session/SessionNames.js';

describe('SessionNames', () => {
  let gtRoot;

  beforeEach(async () => {
    gtRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'gastown-session-'));
    await fsPromises.mkdir(path.join(gtRoot, 'mayor'), { recursive: true });
    await fsPromises.writeFile(
      path.join(gtRoot, 'mayor', 'rigs.json'),
      JSON.stringify({
        rigs: {
          alpha: { beads: { prefix: 'a1' } },
          knjn: { beads: { prefix: 'hq' } },
        },
      }),
      'utf8',
    );
  });

  afterEach(async () => {
    clearSessionRegistryCache();
    await fsPromises.rm(gtRoot, { recursive: true, force: true });
  });

  it('builds a rig prefix registry from mayor/rigs.json', async () => {
    const registry = await buildSessionRegistryFromTown(gtRoot);

    expect(registry.prefixForRig('alpha')).toBe('a1');
    expect(registry.rigForPrefix('a1')).toBe('alpha');
  });

  it('derives current session names for town services and rig agents', async () => {
    const registry = await buildSessionRegistryFromTown(gtRoot);

    expect(mayorSessionName()).toBe('hq-mayor');
    expect(sessionNameForService({ name: 'witness', rig: 'alpha', registry })).toBe('a1-witness');
    expect(sessionNameForAgentAddress('alpha/crew/max', registry)).toBe('a1-crew-max');
    expect(sessionNameForAgentAddress('alpha/polecats/slit', registry)).toBe('a1-slit');
  });

  it('parses hq-prefixed rig sessions without confusing them for town services', async () => {
    const registry = await buildSessionRegistryFromTown(gtRoot);

    expect(parseSessionName('hq-mayor', registry)).toMatchObject({
      role: 'mayor',
      address: 'mayor',
    });

    expect(parseSessionName('hq-witness', registry)).toMatchObject({
      role: 'witness',
      rig: 'knjn',
      address: 'knjn/witness',
    });
  });

  it('extracts running addresses from tmux ls output', async () => {
    const registry = await buildSessionRegistryFromTown(gtRoot);
    const output = [
      'hq-mayor: 1 windows (created Thu)',
      'a1-crew-max: 1 windows (created Thu)',
      'a1-slit: 1 windows (created Thu)',
      'a1-witness: 1 windows (created Thu)',
    ].join('\n');

    expect(parseTmuxSessions(output, registry)).toHaveLength(4);
    expect(Array.from(runningAddressesFromTmux(output, registry))).toEqual([
      'mayor',
      'alpha/crew/max',
      'alpha/slit',
      'alpha/polecats/slit',
      'alpha/witness',
    ]);
  });
});
