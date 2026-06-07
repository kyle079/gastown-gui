import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildAugmentedPathEnv,
  DEFAULT_GT_FALLBACK_PATHS,
  resolveExecutable,
} from '../../server/infrastructure/ExecutableResolver.js';

async function withTempDir(fn) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gastown-exec-resolver-'));
  try {
    return await fn(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function makeExecutable(filePath, script = '#!/usr/bin/env bash\nexit 0\n') {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, script, { mode: 0o755 });
}

describe('ExecutableResolver', () => {
  it('resolves executable from PATH entries', async () => {
    await withTempDir(async (tempDir) => {
      const binDir = path.join(tempDir, 'bin');
      const gtPath = path.join(binDir, 'gt');
      await makeExecutable(gtPath);

      const resolved = resolveExecutable({
        command: 'gt',
        env: { PATH: binDir },
      });

      expect(resolved).toBe(gtPath);
    });
  });

  it('resolves executable from fallback paths when PATH lookup fails', async () => {
    await withTempDir(async (tempDir) => {
      const fallback = path.join(tempDir, 'homebrew', 'bin', 'gt');
      await makeExecutable(fallback);

      const resolved = resolveExecutable({
        command: 'gt',
        fallbackPaths: [fallback],
        env: { PATH: '' },
      });

      expect(resolved).toBe(fallback);
    });
  });

  it('honors explicit override env var', async () => {
    await withTempDir(async (tempDir) => {
      const overridePath = path.join(tempDir, 'custom', 'gt');
      await makeExecutable(overridePath);

      const resolved = resolveExecutable({
        command: 'gt',
        envVarName: 'GT_BIN',
        env: { PATH: '', GT_BIN: overridePath },
      });

      expect(resolved).toBe(overridePath);
    });
  });

  it('throws when override env var points to non-executable path', () => {
    expect(() => resolveExecutable({
      command: 'gt',
      envVarName: 'GT_BIN',
      env: { PATH: '', GT_BIN: '/does/not/exist/gt' },
    })).toThrow('GT_BIN is set but is not executable');
  });

  it('documents homebrew fallback path for gt', () => {
    expect(DEFAULT_GT_FALLBACK_PATHS).toContain('/opt/homebrew/bin/gt');
  });

  it('augments PATH with executable directories ahead of the inherited PATH', () => {
    const env = buildAugmentedPathEnv({
      env: { PATH: '/usr/bin:/bin' },
      executablePaths: ['/opt/tools/gt', '/opt/tools/bd', 'bd'],
    });

    expect(env.PATH).toBe('/opt/tools:/usr/bin:/bin');
  });
});
