import { describe, it, expect } from 'vitest';

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
