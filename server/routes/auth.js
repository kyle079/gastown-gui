import crypto from 'crypto';
import https from 'https';
import { buildLocalStore, verifyPassword } from '../auth/localAuth.js';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_USER_URL = 'https://api.github.com/user';

function getConfig() {
  return {
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_OAUTH_CALLBACK_URL,
    allowlist: (process.env.GITHUB_ALLOWLIST || 'kyle079')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  };
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch { reject(new Error('Non-JSON response from GitHub')); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/json',
          'User-Agent': 'gastown-gui',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch { reject(new Error('Non-JSON response from GitHub')); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

/**
 * @param {import('express').Application} app
 * @param {{ userStore: import('../auth/localAuth.js').MemoryStore }} opts
 */
export function registerAuthRoutes(app, { userStore }) {
  // ─── Local password auth ────────────────────────────────────────────────

  // POST /auth/login — username/password login (JSON body)
  app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    const storedUser = await userStore.findByUsername(username);
    if (!storedUser || !storedUser.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(password, storedUser.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = { id: storedUser.id, username: storedUser.username, roles: storedUser.roles, provider: 'local' };
    req.session.user = user;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      const returnTo = req.session.returnTo ?? '/';
      delete req.session.returnTo;
      console.log(`[Auth] Login: ${username}`);
      res.json({ user, redirectTo: returnTo });
    });
  });

  // GET /auth/me — current local auth user
  app.get('/auth/me', (req, res) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ user });
  });

  // ─── GitHub OAuth (in-app data enrichment, gg-8te) ──────────────────────

  // Status — returns current GitHub auth state for the session
  app.get('/api/auth/status', (req, res) => {
    const { clientId } = getConfig();
    res.json({
      configured: !!clientId,
      connected: !!(req.session && req.session.githubToken),
      login: req.session?.githubLogin || null,
    });
  });

  // Step 1: Redirect to GitHub OAuth
  app.get('/auth/github', (req, res) => {
    const { clientId, callbackUrl } = getConfig();
    if (!clientId) {
      return res.status(503).json({ error: 'GitHub OAuth not configured. Set GITHUB_OAUTH_CLIENT_ID.' });
    }

    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl || `${req.protocol}://${req.get('host')}/auth/github/callback`,
      scope: 'repo read:org',
      state,
    });

    res.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`);
  });

  // Step 2: GitHub redirects here with code + state
  app.get('/auth/github/callback', async (req, res) => {
    const { clientId, clientSecret, callbackUrl, allowlist } = getConfig();
    const { code, state } = req.query;

    if (!state || state !== req.session.oauthState) {
      return res.status(400).send('OAuth state mismatch — possible CSRF. Please try again.');
    }
    delete req.session.oauthState;

    if (!code) {
      return res.status(400).send('No code received from GitHub.');
    }

    try {
      const tokenData = await httpsPost(GITHUB_TOKEN_URL, {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl || `${req.protocol}://${req.get('host')}/auth/github/callback`,
      });

      if (tokenData.error || !tokenData.access_token) {
        console.error('[OAuth] Token exchange error:', tokenData.error_description || tokenData.error);
        return res.status(400).send(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      const accessToken = tokenData.access_token;

      const user = await httpsGet(GITHUB_API_USER_URL, accessToken);
      if (!user.login) {
        return res.status(500).send('Could not retrieve GitHub user info.');
      }

      if (!allowlist.includes(user.login)) {
        console.warn(`[OAuth] Login rejected: ${user.login} not on allowlist`);
        return res.status(403).send(`Access denied. GitHub user '${user.login}' is not authorized.`);
      }

      req.session.githubToken = accessToken;
      req.session.githubLogin = user.login;

      console.log(`[OAuth] GitHub connected: ${user.login}`);
      res.redirect('/?github_connected=1');
    } catch (err) {
      console.error('[OAuth] Callback error:', err.message);
      res.status(500).send('OAuth callback failed: ' + err.message);
    }
  });

  // Logout — clears both local session user and GitHub token
  app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Logout failed' });
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });
}
