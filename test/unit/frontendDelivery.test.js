import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { createFrontendDelivery, isLegacyFrontendPath } from '../../server/app/frontendDelivery.js';

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
    expect(mounted[1]).toEqual(['/assets', { dir: path.join(rootDir, 'assets') }]);
  });

  it('keeps React delivery mode explicit when web/dist is missing', () => {
    const rootDir = makeFixture({});

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

    expect(delivery.mode).toBe('react-dist-missing');
    expect(headers.get('Cache-Control')).toBe('no-store, must-revalidate');
    expect(sentPath).toBe(path.join(rootDir, 'web/dist/index.html'));
  });

  it('identifies removed legacy frontend paths', () => {
    expect(isLegacyFrontendPath('/index.html')).toBe(true);
    expect(isLegacyFrontendPath('/js/app.js')).toBe(true);
    expect(isLegacyFrontendPath('/css/layout.css')).toBe(true);
    expect(isLegacyFrontendPath('/assets/favicon.ico')).toBe(false);
    expect(isLegacyFrontendPath('/work/convoy-1')).toBe(false);
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
