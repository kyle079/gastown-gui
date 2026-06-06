/**
 * Token-based GitHub REST API gateway using native fetch (Node 18+).
 * Uses GITHUB_TOKEN env var — no gh CLI, no committed credentials.
 * Coordinate with gg-ett for the canonical one-module github client.
 */
export class GitHubTokenGateway {
  constructor({ token } = {}) {
    this._token = token || process.env.GITHUB_TOKEN || null;
    this._base = 'https://api.github.com';
  }

  _headers() {
    const h = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this._token) h.Authorization = `Bearer ${this._token}`;
    return h;
  }

  async _get(path, { timeoutMs = 15000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this._base}${path}`, {
        headers: this._headers(),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, status: res.status, error: body?.message || `HTTP ${res.status}`, data: null };
      }
      return { ok: true, status: res.status, data: body };
    } catch (err) {
      clearTimeout(timer);
      return { ok: false, status: 0, error: err.message || 'fetch failed', data: null };
    }
  }

  /** GET /repos/{owner}/{repo}/pulls/{pull_number} */
  async getPullRequest({ owner, repo, number } = {}) {
    return this._get(`/repos/${owner}/${repo}/pulls/${number}`);
  }

  /** GET /repos/{owner}/{repo}/pulls/{pull_number}/files */
  async getPullRequestFiles({ owner, repo, number } = {}) {
    return this._get(`/repos/${owner}/${repo}/pulls/${number}/files?per_page=100`);
  }

  /** GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews */
  async getPullRequestReviews({ owner, repo, number } = {}) {
    return this._get(`/repos/${owner}/${repo}/pulls/${number}/reviews?per_page=100`);
  }

  /** GET /repos/{owner}/{repo}/issues/{issue_number}/comments (PR comments) */
  async getPullRequestComments({ owner, repo, number } = {}) {
    return this._get(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`);
  }

  /** GET /repos/{owner}/{repo}/commits/{ref}/check-runs */
  async getCheckRuns({ owner, repo, ref } = {}) {
    return this._get(`/repos/${owner}/${repo}/commits/${ref}/check-runs?per_page=100`);
  }
}
