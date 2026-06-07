import { randomBytes } from 'crypto';
import { request as httpsRequest } from 'https';

// CSRF state nonces: state -> { createdAt }
const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Prune expired states periodically
setInterval(() => {
  const cutoff = Date.now() - STATE_TTL_MS;
  for (const [k, v] of pendingStates) {
    if (v.createdAt < cutoff) pendingStates.delete(k);
  }
}, 5 * 60 * 1000).unref();

export class GitHubOAuth {
  constructor({ clientId, clientSecret, callbackUrl, allowlist = ['kyle079'] } = {}) {
    this._clientId = clientId || null;
    this._clientSecret = clientSecret || null;
    this._callbackUrl = callbackUrl || null;
    this._allowlist = Array.isArray(allowlist)
      ? new Set(allowlist.map(l => l.trim().toLowerCase()).filter(Boolean))
      : new Set(['kyle079']);
  }

  get configured() {
    return !!(this._clientId && this._clientSecret && this._callbackUrl);
  }

  generateAuthUrl() {
    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, { createdAt: Date.now() });

    const params = new URLSearchParams({
      client_id: this._clientId,
      redirect_uri: this._callbackUrl,
      scope: 'repo read:user read:org',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  consumeState(state) {
    if (!state) return false;
    const entry = pendingStates.get(state);
    if (!entry) return false;
    const valid = Date.now() - entry.createdAt < STATE_TTL_MS;
    pendingStates.delete(state);
    return valid;
  }

  async exchangeCode(code) {
    const body = JSON.stringify({
      client_id: this._clientId,
      client_secret: this._clientSecret,
      code,
      redirect_uri: this._callbackUrl,
    });

    const data = await this._post(
      'github.com',
      '/login/oauth/access_token',
      body,
      { Accept: 'application/json', 'Content-Type': 'application/json' }
    );

    if (data.error) throw new Error(data.error_description || data.error);
    if (!data.access_token) throw new Error('No access_token in GitHub response');
    return data.access_token;
  }

  async getUser(token) {
    const data = await this._get(
      'api.github.com',
      '/user',
      { Authorization: `token ${token}`, 'User-Agent': 'gastown-gui', Accept: 'application/vnd.github+json' }
    );
    return {
      login: data.login,
      avatarUrl: data.avatar_url,
      name: data.name,
    };
  }

  isAllowed(login) {
    if (!login) return false;
    return this._allowlist.has(login.toLowerCase());
  }

  _get(host, path, headers) {
    return new Promise((resolve, reject) => {
      const req = httpsRequest({ host, path, method: 'GET', headers }, (res) => {
        let buf = '';
        res.on('data', d => { buf += d; });
        res.on('end', () => {
          try { resolve(JSON.parse(buf)); }
          catch { reject(new Error('Failed to parse GitHub response')); }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  _post(host, path, body, headers) {
    return new Promise((resolve, reject) => {
      const req = httpsRequest(
        { host, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(body) } },
        (res) => {
          let buf = '';
          res.on('data', d => { buf += d; });
          res.on('end', () => {
            try { resolve(JSON.parse(buf)); }
            catch { reject(new Error('Failed to parse GitHub response')); }
          });
        }
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
