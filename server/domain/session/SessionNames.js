import path from 'node:path';
import fsPromises from 'node:fs/promises';

export const DEFAULT_PREFIX = 'gt';

const HQ_PREFIX = 'hq';
const LEGACY_PREFIXES = ['gt', 'bd', 'hq', 'gthq'];
const registryCache = new Map();

class SessionRegistry {
  constructor() {
    this._prefixToRig = new Map();
    this._rigToPrefix = new Map();
  }

  register(prefix, rigName) {
    if (!prefix || !rigName) return;
    this._prefixToRig.set(prefix, rigName);
    this._rigToPrefix.set(rigName, prefix);
  }

  rigForPrefix(prefix) {
    return this._prefixToRig.get(prefix) || prefix;
  }

  prefixForRig(rigName) {
    return this._rigToPrefix.get(rigName) || DEFAULT_PREFIX;
  }

  prefixes() {
    return Array.from(
      new Set([...this._prefixToRig.keys(), ...LEGACY_PREFIXES]),
    ).sort((a, b) => b.length - a.length);
  }
}

async function getRegistrySource(gtRoot) {
  const canonical = path.join(gtRoot, 'mayor', 'rigs.json');
  const fallback = path.join(gtRoot, 'rigs.json');

  try {
    const stats = await fsPromises.stat(canonical);
    return { source: canonical, signature: `${canonical}:${stats.mtimeMs}:${stats.size}` };
  } catch {}

  try {
    const stats = await fsPromises.stat(fallback);
    return { source: fallback, signature: `${fallback}:${stats.mtimeMs}:${stats.size}` };
  } catch {}

  return { source: null, signature: 'missing' };
}

function buildRegistryFromObject(data) {
  const registry = new SessionRegistry();
  const rigs = data?.rigs;

  if (!rigs || typeof rigs !== 'object') {
    return registry;
  }

  for (const [rigName, rigConfig] of Object.entries(rigs)) {
    const prefix = rigConfig?.beads?.prefix;
    if (typeof prefix === 'string' && prefix.trim()) {
      registry.register(prefix.trim(), rigName);
    }
  }

  return registry;
}

export async function buildSessionRegistryFromTown(gtRoot) {
  if (!gtRoot) {
    return new SessionRegistry();
  }

  const { source, signature } = await getRegistrySource(gtRoot);
  const cached = registryCache.get(gtRoot);
  if (cached?.signature === signature) {
    return cached.registry;
  }

  let registry = new SessionRegistry();

  if (source) {
    try {
      const content = await fsPromises.readFile(source, 'utf8');
      registry = buildRegistryFromObject(JSON.parse(content));
    } catch {
      registry = new SessionRegistry();
    }
  }

  registryCache.set(gtRoot, { signature, registry });
  return registry;
}

export function clearSessionRegistryCache(gtRoot) {
  if (gtRoot) {
    registryCache.delete(gtRoot);
    return;
  }

  registryCache.clear();
}

export function mayorSessionName() {
  return `${HQ_PREFIX}-mayor`;
}

export function deaconSessionName() {
  return `${HQ_PREFIX}-deacon`;
}

export function witnessSessionName(rigPrefix) {
  return `${rigPrefix}-witness`;
}

export function refinerySessionName(rigPrefix) {
  return `${rigPrefix}-refinery`;
}

export function crewSessionName(rigPrefix, name) {
  return `${rigPrefix}-crew-${name}`;
}

export function polecatSessionName(rigPrefix, name) {
  return `${rigPrefix}-${name}`;
}

export function sessionNameForService({ name, rig, registry } = {}) {
  switch (String(name || '').toLowerCase()) {
    case 'mayor':
      return mayorSessionName();
    case 'deacon':
      return deaconSessionName();
    case 'witness':
      return rig ? witnessSessionName(registry?.prefixForRig(rig) || DEFAULT_PREFIX) : null;
    case 'refinery':
      return rig ? refinerySessionName(registry?.prefixForRig(rig) || DEFAULT_PREFIX) : null;
    default:
      return null;
  }
}

export function sessionNameForAgentAddress(address, registry) {
  const normalized = String(address || '').trim().replace(/\/$/, '');
  if (!normalized) return null;

  if (normalized === 'mayor') return mayorSessionName();
  if (normalized === 'deacon') return deaconSessionName();

  const parts = normalized.split('/');
  if (parts.length < 2) return null;

  const [rig, roleOrName, extra] = parts;
  const prefix = registry?.prefixForRig(rig) || DEFAULT_PREFIX;

  if (parts.length === 2) {
    if (roleOrName === 'witness') return witnessSessionName(prefix);
    if (roleOrName === 'refinery') return refinerySessionName(prefix);
    return polecatSessionName(prefix, roleOrName);
  }

  if (parts.length === 3 && roleOrName === 'crew') {
    return crewSessionName(prefix, extra);
  }

  if (parts.length === 3 && roleOrName === 'polecats') {
    return polecatSessionName(prefix, extra);
  }

  return null;
}

export function parseSessionName(sessionName, registry) {
  const normalized = String(sessionName || '').trim();
  if (!normalized) return null;

  if (normalized === mayorSessionName()) {
    return { role: 'mayor', session: normalized, address: 'mayor' };
  }

  if (normalized === deaconSessionName()) {
    return { role: 'deacon', session: normalized, address: 'deacon' };
  }

  if (normalized === `${HQ_PREFIX}-boot`) {
    return { role: 'boot', session: normalized };
  }

  if (normalized === `${HQ_PREFIX}-overseer`) {
    return { role: 'overseer', session: normalized, address: 'overseer' };
  }

  if (normalized.startsWith(`${HQ_PREFIX}-dog-`)) {
    return {
      role: 'dog',
      name: normalized.slice(`${HQ_PREFIX}-dog-`.length),
      session: normalized,
    };
  }

  for (const prefix of registry?.prefixes?.() || LEGACY_PREFIXES) {
    const marker = `${prefix}-`;
    if (!normalized.startsWith(marker)) continue;

    const rest = normalized.slice(marker.length);
    if (!rest) return null;

    const rig = registry?.rigForPrefix?.(prefix) || prefix;

    if (rest === 'witness') {
      return {
        role: 'witness',
        rig,
        prefix,
        session: normalized,
        address: `${rig}/witness`,
      };
    }

    if (rest === 'refinery') {
      return {
        role: 'refinery',
        rig,
        prefix,
        session: normalized,
        address: `${rig}/refinery`,
      };
    }

    if (rest.startsWith('crew-')) {
      const name = rest.slice('crew-'.length);
      if (!name) return null;

      return {
        role: 'crew',
        rig,
        prefix,
        name,
        session: normalized,
        address: `${rig}/crew/${name}`,
      };
    }

    return {
      role: 'polecat',
      rig,
      prefix,
      name: rest,
      session: normalized,
      address: `${rig}/${rest}`,
      legacyAddress: `${rig}/polecats/${rest}`,
    };
  }

  return null;
}

export function parseTmuxSessions(output, registry) {
  const identities = [];

  for (const line of String(output || '').split('\n')) {
    const match = line.match(/^([^:]+):/);
    if (!match) continue;

    const identity = parseSessionName(match[1], registry);
    if (identity) identities.push(identity);
  }

  return identities;
}

export function runningAddressesFromTmux(output, registry) {
  const addresses = new Set();

  for (const identity of parseTmuxSessions(output, registry)) {
    if (identity.address) addresses.add(identity.address);
    if (identity.legacyAddress) addresses.add(identity.legacyAddress);
  }

  return addresses;
}
