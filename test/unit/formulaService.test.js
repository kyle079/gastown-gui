import { describe, it, expect } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fsPromises from 'node:fs/promises';

import { FormulaService } from '../../server/services/FormulaService.js';

function createStubGateways() {
  const calls = [];
  const gtGateway = {
    exec: async (args, opts) => {
      calls.push({ args, opts });
      return { ok: true, stdout: 'ok', stderr: '', error: null };
    },
  };
  const bdGateway = {
    exec: async () => ({ ok: false, stdout: '', error: 'bd disabled in test' }),
  };
  return { calls, gtGateway, bdGateway };
}

describe('FormulaService', () => {
  it('list() falls back to formula files when CLI discovery is empty or unavailable', async () => {
    const formulasDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'gastown-formulas-list-'));

    try {
      await fsPromises.writeFile(
        path.join(formulasDir, 'sample.formula.toml'),
        `description = """
Sample workflow used for fallback testing.
"""
formula = "sample"
type = "workflow"

[vars.issue]
description = "Issue ID"

[[steps]]
id = "one"
title = "One"
`,
        'utf8',
      );

      const service = new FormulaService({
        gtGateway: {
          exec: async (args) => {
            if (args.includes('--json')) return { ok: true, stdout: '[]', stderr: '', error: null };
            return { ok: false, stdout: '', stderr: '', error: 'gt unavailable' };
          },
        },
        bdGateway: { exec: async () => ({ ok: false, stdout: '', stderr: '', error: 'bd unavailable' }) },
        formulasDir,
      });

      await expect(service.list()).resolves.toEqual([
        {
          name: 'sample',
          type: 'workflow',
          description: 'Sample workflow used for fallback testing.',
          source: path.join(formulasDir, 'sample.formula.toml'),
          steps: 1,
          vars: 1,
        },
      ]);
    } finally {
      await fsPromises.rm(formulasDir, { recursive: true, force: true });
    }
  });

  it('list() throws when every discovery path fails', async () => {
    const service = new FormulaService({
      gtGateway: { exec: async () => ({ ok: false, stdout: '', stderr: '', error: 'gt unavailable' }) },
      bdGateway: { exec: async () => ({ ok: false, stdout: '', stderr: '', error: 'bd unavailable' }) },
      formulasDir: path.join(os.tmpdir(), `missing-formulas-${Date.now()}`),
    });

    await expect(service.list()).rejects.toThrow(/Unable to load formulas|gt unavailable/);
  });

  it('use() calls "formula run" with --rig flag', async () => {
    const { calls, gtGateway, bdGateway } = createStubGateways();
    const emitted = [];

    const service = new FormulaService({
      gtGateway,
      bdGateway,
      emit: (type, data) => emitted.push([type, data]),
    });

    const result = await service.use({ name: 'fix-bug', target: 'my-rig', args: 'issue=AUTH-1' });

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toEqual(['formula', 'run', 'fix-bug', '--rig', 'my-rig', '--args', 'issue=AUTH-1']);
    expect(emitted[0]).toEqual(['formula_used', { name: 'fix-bug', target: 'my-rig' }]);
  });

  it('use() omits --rig when target is not provided', async () => {
    const { calls, gtGateway, bdGateway } = createStubGateways();

    const service = new FormulaService({ gtGateway, bdGateway });

    const result = await service.use({ name: 'quick-fix' });

    expect(result.ok).toBe(true);
    expect(calls[0].args).toEqual(['formula', 'run', 'quick-fix']);
  });

  it('use() omits --args when args is not provided', async () => {
    const { calls, gtGateway, bdGateway } = createStubGateways();

    const service = new FormulaService({ gtGateway, bdGateway });

    const result = await service.use({ name: 'fix-bug', target: 'zoo-game' });

    expect(result.ok).toBe(true);
    expect(calls[0].args).toEqual(['formula', 'run', 'fix-bug', '--rig', 'zoo-game']);
  });

  it('use() returns error when gt exec fails', async () => {
    const { gtGateway, bdGateway } = createStubGateways();
    gtGateway.exec = async () => ({ ok: false, stdout: '', error: 'formula not found' });
    const emitted = [];

    const service = new FormulaService({
      gtGateway,
      bdGateway,
      emit: (type, data) => emitted.push([type, data]),
    });

    const result = await service.use({ name: 'missing', target: 'rig-1' });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('formula not found');
    expect(emitted).toHaveLength(0);
  });
});
