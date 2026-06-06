/**
 * GitHub OAuth connect/disconnect widget.
 *
 * Renders a "Sign in with GitHub" button (or connected state) into any container.
 * Reads auth status from /api/auth/status and redirects to /auth/github for the OAuth flow.
 */

import { api } from '../api.js';
import { showToast } from './toast.js';

let authStatus = null;

export async function loadGitHubAuthStatus() {
  try {
    authStatus = await api.getAuthStatus();
  } catch {
    authStatus = { configured: false, connected: false, login: null };
  }
  return authStatus;
}

export function getAuthStatus() {
  return authStatus;
}

export function renderGitHubAuthWidget(container) {
  if (!container) return;

  if (!authStatus) {
    container.innerHTML = '';
    return;
  }

  if (!authStatus.configured) {
    container.innerHTML = `
      <div class="github-auth-widget unconfigured">
        <span class="material-icons" style="font-size:16px;vertical-align:middle;opacity:.5">link_off</span>
        <span class="github-auth-label">GitHub not configured</span>
      </div>
    `;
    return;
  }

  if (authStatus.connected) {
    container.innerHTML = `
      <div class="github-auth-widget connected">
        <span class="material-icons" style="font-size:16px;vertical-align:middle;color:var(--color-success,#3fb950)">check_circle</span>
        <span class="github-auth-label">GitHub: <strong>${authStatus.login}</strong></span>
        <button class="btn btn-sm btn-ghost github-disconnect-btn" title="Disconnect GitHub">Disconnect</button>
      </div>
    `;
    container.querySelector('.github-disconnect-btn')?.addEventListener('click', async () => {
      try {
        await api.githubLogout();
        authStatus = { ...authStatus, connected: false, login: null };
        renderGitHubAuthWidget(container);
        showToast('GitHub disconnected', 'info');
      } catch (err) {
        showToast('Disconnect failed: ' + err.message, 'error');
      }
    });
  } else {
    container.innerHTML = `
      <div class="github-auth-widget disconnected">
        <a class="btn btn-sm btn-primary github-connect-btn" href="/auth/github">
          <span class="material-icons" style="font-size:16px;vertical-align:middle">login</span>
          Sign in with GitHub
        </a>
      </div>
    `;
  }
}
