function extractGitHubRepo(gitUrl) {
  if (!gitUrl) return null;
  // Handle: https://github.com/owner/repo, git@github.com:owner/repo, etc.
  const match = String(gitUrl).match(/github\.com[:/]([^/]+\/[^/.\s]+)/);
  if (!match) return null;
  return match[1].replace(/\.git$/, '');
}

export class GitHubService {
  constructor({
    gitHubGateway,
    statusService,
    cache,
    prsTtlMs = 30000,
    issuesTtlMs = 30000,
    reposTtlMs = 5 * 60 * 1000,
  } = {}) {
    if (!gitHubGateway) throw new Error('GitHubService requires gitHubGateway');
    if (!gitHubGateway.listPullRequests) throw new Error('GitHubService requires gitHubGateway.listPullRequests()');
    if (!gitHubGateway.viewPullRequest) throw new Error('GitHubService requires gitHubGateway.viewPullRequest()');
    if (!gitHubGateway.listIssues) throw new Error('GitHubService requires gitHubGateway.listIssues()');
    if (!gitHubGateway.viewIssue) throw new Error('GitHubService requires gitHubGateway.viewIssue()');
    if (!gitHubGateway.listRepos) throw new Error('GitHubService requires gitHubGateway.listRepos()');
    if (!statusService?.getStatus) throw new Error('GitHubService requires statusService.getStatus()');

    this._gh = gitHubGateway;
    this._status = statusService;
    this._cache = cache ?? null;
    this._prsTtlMs = prsTtlMs;
    this._issuesTtlMs = issuesTtlMs;
    this._reposTtlMs = reposTtlMs;
  }

  async listPullRequests({ state = 'open', refresh = false } = {}) {
    const key = `github_prs_${state}`;
    const ttlMs = this._prsTtlMs;

    if (!refresh && this._cache?.getOrExecute) {
      return this._cache.getOrExecute(key, () => this._fetchPullRequests({ state, refresh }), ttlMs);
    }
    if (!refresh && this._cache?.get) {
      const cached = this._cache.get(key);
      if (cached !== undefined) return cached;
    }

    const prs = await this._fetchPullRequests({ state, refresh });
    this._cache?.set?.(key, prs, ttlMs);
    return prs;
  }

  async _fetchPullRequests({ state, refresh }) {
    const status = await this._status.getStatus({ refresh });
    const rigs = Array.isArray(status?.rigs) ? status.rigs : [];

    const promises = rigs
      .filter(rig => rig?.git_url)
      .map(async (rig) => {
        const repo = extractGitHubRepo(rig.git_url);
        if (!repo) return [];

        const result = await this._gh.listPullRequests({ repo, state, limit: 20 });
        if (!result.ok || !Array.isArray(result.data)) return [];

        return result.data.map(pr => ({ ...pr, rig: rig.name, repo }));
      });

    const results = await Promise.all(promises);
    const all = results.flat();

    all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return all;
  }

  async viewPullRequest({ repo, number, refresh = false } = {}) {
    const key = `github_pr_${repo}_${number}`;
    const ttlMs = this._prsTtlMs;

    if (!refresh && this._cache?.getOrExecute) {
      return this._cache.getOrExecute(key, () => this._fetchPullRequest({ repo, number }), ttlMs);
    }
    if (!refresh && this._cache?.get) {
      const cached = this._cache.get(key);
      if (cached !== undefined) return cached;
    }

    const pr = await this._fetchPullRequest({ repo, number });
    this._cache?.set?.(key, pr, ttlMs);
    return pr;
  }

  async _fetchPullRequest({ repo, number }) {
    const result = await this._gh.viewPullRequest({ repo, number });
    if (!result.ok) throw new Error(result.error || 'Failed to fetch pull request');
    return result.data || {};
  }

  /**
   * Fetch full PR detail via token-based REST API (no gh CLI).
   * Returns metadata, body, files, reviews, comments, and check-runs.
   * Falls back gracefully if individual sub-requests fail.
   */
  async viewPullRequestDetail({ owner, repo, number, refresh = false } = {}) {
    const key = `github_pr_detail_${owner}_${repo}_${number}`;
    const ttlMs = this._prsTtlMs;

    if (!refresh && this._cache?.getOrExecute) {
      return this._cache.getOrExecute(key, () => this._fetchPullRequestDetail({ owner, repo, number }), ttlMs);
    }
    if (!refresh && this._cache?.get) {
      const cached = this._cache.get(key);
      if (cached !== undefined) return cached;
    }

    const detail = await this._fetchPullRequestDetail({ owner, repo, number });
    this._cache?.set?.(key, detail, ttlMs);
    return detail;
  }

  async _fetchPullRequestDetail({ owner, repo, number }) {
    // viewPullRequest already fetches PR metadata, reviews, and files via Octokit.
    const combinedRepo = `${owner}/${repo}`;
    const [prRes, commentsRes] = await Promise.all([
      this._gh.viewPullRequest({ repo: combinedRepo, number }),
      this._gh.listPullRequestComments({ owner, repo, number }),
    ]);

    if (!prRes.ok) throw new Error(prRes.error || 'Failed to fetch PR');

    const pr = prRes.data;

    let checks = [];
    if (pr.headSha) {
      const checksRes = await this._gh.listCheckRuns({ owner, repo, ref: pr.headSha });
      if (checksRes.ok && Array.isArray(checksRes.data)) {
        checks = checksRes.data.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          conclusion: c.conclusion,
          url: c.html_url,
          app: c.app?.name,
        }));
      }
    }

    return {
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      state: pr.state,
      draft: pr.isDraft,
      merged: pr.state === 'closed' && Boolean(pr.mergedAt),
      mergedAt: pr.mergedAt ?? null,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      url: pr.url,
      author: pr.author ?? null,
      headRefName: pr.headRefName,
      baseRefName: pr.baseRefName,
      headSha: pr.headSha,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
      labels: pr.labels ?? [],
      reviewDecision: pr.reviewDecision ?? null,
      files: Array.isArray(pr.files) ? pr.files : [],
      reviews: Array.isArray(pr.reviews) ? pr.reviews : [],
      comments: commentsRes.ok && Array.isArray(commentsRes.data)
        ? commentsRes.data.map(c => ({
            id: c.id,
            user: c.user?.login,
            body: c.body,
            createdAt: c.created_at,
          }))
        : [],
      checks,
    };
  }

  async listIssues({ state = 'open', refresh = false } = {}) {
    const key = `github_issues_${state}`;
    const ttlMs = this._issuesTtlMs;

    if (!refresh && this._cache?.getOrExecute) {
      return this._cache.getOrExecute(key, () => this._fetchIssues({ state, refresh }), ttlMs);
    }
    if (!refresh && this._cache?.get) {
      const cached = this._cache.get(key);
      if (cached !== undefined) return cached;
    }

    const issues = await this._fetchIssues({ state, refresh });
    this._cache?.set?.(key, issues, ttlMs);
    return issues;
  }

  async _fetchIssues({ state, refresh }) {
    const status = await this._status.getStatus({ refresh });
    const rigs = Array.isArray(status?.rigs) ? status.rigs : [];

    const promises = rigs
      .filter(rig => rig?.git_url)
      .map(async (rig) => {
        const repo = extractGitHubRepo(rig.git_url);
        if (!repo) return [];

        const result = await this._gh.listIssues({ repo, state, limit: 30 });
        if (!result.ok || !Array.isArray(result.data)) return [];

        return result.data.map(issue => ({ ...issue, repo, rig: rig.name }));
      });

    const results = await Promise.all(promises);
    const all = results.flat();
    all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return all;
  }

  async viewIssue({ repo, number } = {}) {
    const result = await this._gh.viewIssue({ repo, number });
    if (!result.ok) throw new Error(result.error || 'Failed to fetch issue');
    return result.data || {};
  }

  async listRepos({ limit = 100, visibility, refresh = false } = {}) {
    const key = `github_repos_${visibility || 'all'}_${limit}`;
    const ttlMs = this._reposTtlMs;

    if (!refresh && this._cache?.getOrExecute) {
      return this._cache.getOrExecute(key, () => this._fetchRepos({ limit, visibility }), ttlMs);
    }
    if (!refresh && this._cache?.get) {
      const cached = this._cache.get(key);
      if (cached !== undefined) return cached;
    }

    const repos = await this._fetchRepos({ limit, visibility });
    this._cache?.set?.(key, repos, ttlMs);
    return repos;
  }

  async _fetchRepos({ limit, visibility }) {
    const result = await this._gh.listRepos({ limit, visibility });
    if (!result.ok || !Array.isArray(result.data)) {
      throw new Error(result.error || 'Failed to list repos');
    }

    const repos = result.data.slice();
    repos.sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt));
    return repos;
  }
}

