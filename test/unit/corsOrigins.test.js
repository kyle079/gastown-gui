import { describe, it, expect, vi, afterEach } from 'vitest';
import os from 'os';

import { buildDefaultOrigins } from '../../server/app/corsOrigins.js';

describe('buildDefaultOrigins', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always allows loopback origins', () => {
    const origins = buildDefaultOrigins({ host: '127.0.0.1', port: 7667 });
    expect(origins).toContain('http://localhost:7667');
    expect(origins).toContain('http://127.0.0.1:7667');
    expect(origins).toContain('http://[::1]:7667');
  });

  it('adds the configured host when bound to a specific address', () => {
    const origins = buildDefaultOrigins({ host: '192.168.1.50', port: 7667 });
    expect(origins).toContain('http://192.168.1.50:7667');
    expect(origins).toContain('http://localhost:7667');
  });

  it('enumerates LAN addresses when bound to 0.0.0.0', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      eth0: [
        { address: '192.168.1.42', family: 'IPv4', internal: false },
        { address: 'fe80::1%eth0', family: 'IPv6', internal: false },
      ],
    });

    const origins = buildDefaultOrigins({ host: '0.0.0.0', port: 7667 });
    expect(origins).toContain('http://192.168.1.42:7667');
    // IPv6 bracketed with the zone index stripped
    expect(origins).toContain('http://[fe80::1]:7667');
    // Internal loopback from os is skipped (added explicitly, not duplicated)
    expect(origins.filter((o) => o === 'http://127.0.0.1:7667')).toHaveLength(1);
  });

  it('treats :: as a wildcard host and enumerates LAN addresses', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      eth0: [{ address: '10.0.0.5', family: 'IPv4', internal: false }],
    });

    const origins = buildDefaultOrigins({ host: '::', port: 8080 });
    expect(origins).toContain('http://10.0.0.5:8080');
  });

  it('defaults host to 127.0.0.1', () => {
    const origins = buildDefaultOrigins({ port: 7667 });
    expect(origins).toContain('http://127.0.0.1:7667');
  });

  it('returns de-duplicated origins', () => {
    const origins = buildDefaultOrigins({ host: 'localhost', port: 7667 });
    expect(new Set(origins).size).toBe(origins.length);
  });
});
