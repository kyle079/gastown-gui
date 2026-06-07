import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { createFrontendDelivery } from '../../server/app/frontendDelivery.js';

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('createFrontendDelivery', () => {
  it('prefers the built React frontend when web/dist exists', () => {
    const rootDir = makeFixture({
      'web/dist/index.html': '<html>modern</html>',
      'index.html': '<html>legacy</html>',
    });

    const mounted = [];
    const delivery = createFrontendDelivery({
      rootDir,
      staticFactory(dir) {
        return { dir };
      },
    });
    delivery.mount({
      use(...args) {
        mounted.push(args);
      },
    });

    expect(delivery.mode).toBe('react-dist');
    expect(mounted[0][0]).toEqual({ dir: path.join(rootDir, 'web/dist') });
  });

  it('falls back to the legacy spa when web/dist is missing', () => {
    const rootDir = makeFixture({
      'index.html': '<html>legacy</html>',
    });

    const delivery = createFrontendDelivery({
      rootDir,
      staticFactory(dir) {
        return { dir };
      },
    });
    const headers = new Map();
    let sentPath = null;
    delivery.sendIndex({
      setHeader(key, value) {
        headers.set(key, value);
      },
      sendFile(filePath) {
        sentPath = filePath;
      },
    });

    expect(delivery.mode).toBe('legacy-spa');
    expect(headers.get('Cache-Control')).toBe('no-store, must-revalidate');
    expect(sentPath).toBe(path.join(rootDir, 'index.html'));
  });
});

function makeFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gastown-frontend-'));
  tempDirs.push(dir);

  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, contents);
  }

  return dir;
}
