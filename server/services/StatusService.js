import path from 'node:path';
import fsPromises from 'node:fs/promises';
import {
  buildSessionRegistryFromTown,
  parseTmuxSessions,
} from '../domain/session/SessionNames.js';

async function readRigConfig({ gtRoot, rigName }) {
  const rigConfigPath = path.join(gtRoot, rigName, 'config.json');
  const content = await fsPromises.readFile(rigConfigPath, 'utf8');
  return JSON.parse(content);
}

export class StatusService {
  constructor({
    gtGateway,
    tmuxGateway,
    cache,
    gtRoot,
    statusTtlMs = 5000,
    rigConfigTtlMs = 300000,
    missingRigConfigTtlMs = 60000,
  } = {}) {
    if (!gtGateway?.status) throw new Error('StatusService requires gtGateway.status()');
    if (!tmuxGateway?.listSessions) throw new Error('StatusService requires tmuxGateway.listSessions()');
    if (!gtRoot) throw new Error('StatusService requires gtRoot');

    this._gt = gtGateway;
    this._tmux = tmuxGateway;
    this._cache = cache ?? null;
    this._gtRoot = gtRoot;
    this._statusTtlMs = statusTtlMs;
    this._rigConfigTtlMs = rigConfigTtlMs;
    this._missingRigConfigTtlMs = missingRigConfigTtlMs;
  }

  async getStatus({ refresh = false } = {}) {
    if (!refresh && this._cache?.getOrExecute) {
      return this._cache.getOrExecute('status', () => this._fetchStatus(), this._statusTtlMs);
    }

    if (!refresh && this._cache?.get) {
      const cached = this._cache.get('status');
      if (cached !== undefined) return cached;
    }

    const status = await this._fetchStatus();
    this._cache?.set?.('status', status, this._statusTtlMs);
    return status;
  }

  async _fetchStatus() {
    const [statusResult, sessionsText] = await Promise.all([
      this._gt.status({ fast: true, allowExitCodes: [0, 1] }),
      this._tmux.listSessions(),
    ]);

    if (!statusResult.ok) {
      throw new Error(statusResult.error || 'Failed to get status');
    }

    const data = statusResult.data;
    if (!data) return { raw: statusResult.raw };

    const rigs = Array.isArray(data.rigs) ? data.rigs : [];
    const registry = await buildSessionRegistryFromTown(this._gtRoot);
    const identities = parseTmuxSessions(sessionsText, registry);
    const runningAgents = new Set(
      identities
        .map(identity => identity.address)
        .filter(Boolean),
    );
    const runningPolecats = new Set(
      identities
        .filter(identity => identity.role === 'polecat')
        .map(identity => identity.address)
        .filter(Boolean),
    );

    for (const rig of rigs) {
      if (!rig?.name) continue;

      if (!rig.git_url) {
        const rigConfig = await this._getRigConfig(rig.name);
        rig.git_url = rigConfig?.git_url || null;
      }

      for (const hook of rig.hooks || []) {
        const agentPath = hook.agent;
        hook.running = runningAgents.has(agentPath);

        // Compatibility: older systems may store polecats in a subdirectory
        const polecatPath = String(agentPath || '').replace(/\//, '/polecats/');
        if (!hook.running && polecatPath !== agentPath && runningAgents.has(polecatPath)) {
          hook.running = true;
        }
      }
    }

    data.runningPolecats = Array.from(runningPolecats);
    return data;
  }

  async _getRigConfig(rigName) {
    const key = `rig-config:${rigName}`;

    if (this._cache?.get) {
      const cached = this._cache.get(key);
      if (cached !== undefined) return cached;
    }

    try {
      const config = await readRigConfig({ gtRoot: this._gtRoot, rigName });
      this._cache?.set?.(key, config, this._rigConfigTtlMs);
      return config;
    } catch {
      this._cache?.set?.(key, null, this._missingRigConfigTtlMs);
      return null;
    }
  }
}
