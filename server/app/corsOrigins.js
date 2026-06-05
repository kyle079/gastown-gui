import os from 'os';

/**
 * Format a host for use in an HTTP Origin string. IPv6 addresses must be
 * bracketed (e.g. http://[::1]:7667) and any zone index (fe80::1%eth0) stripped.
 */
function formatOriginHost(address, family) {
  const isIPv6 =
    family === 'IPv6' || family === 6 || (typeof address === 'string' && address.includes(':'));
  if (isIPv6) {
    const bare = String(address).split('%')[0];
    return `[${bare}]`;
  }
  return address;
}

// Hosts that mean "bind to all interfaces" rather than a single address.
const WILDCARD_HOSTS = new Set(['0.0.0.0', '::', '']);

/**
 * Build the default list of allowed CORS origins from the configured bind host
 * and port.
 *
 * Loopback origins (localhost, 127.0.0.1, [::1]) are always allowed. When bound
 * to a specific host, that host is added. When bound to a wildcard host
 * (0.0.0.0 / ::), the machine's external LAN addresses are enumerated and added
 * so the GUI works when accessed over the network — fixing the CORS rejection
 * seen with `gastown-gui start --host 0.0.0.0`.
 *
 * @param {object} opts
 * @param {string} [opts.host='127.0.0.1'] Host the server binds to.
 * @param {string|number} opts.port Port the server listens on.
 * @returns {string[]} De-duplicated list of allowed origins.
 */
export function buildDefaultOrigins({ host = '127.0.0.1', port } = {}) {
  const origins = new Set();
  const add = (h, family) => {
    const formatted = formatOriginHost(h, family);
    if (formatted) origins.add(`http://${formatted}:${port}`);
  };

  // Loopback is always allowed.
  add('localhost');
  add('127.0.0.1');
  add('::1', 'IPv6');

  if (WILDCARD_HOSTS.has(host)) {
    // Bound to all interfaces — allow LAN addresses so network access works.
    const interfaces = os.networkInterfaces();
    for (const addrs of Object.values(interfaces)) {
      for (const addr of addrs || []) {
        if (addr.internal) continue;
        add(addr.address, addr.family);
      }
    }
  } else {
    add(host);
  }

  return [...origins];
}
