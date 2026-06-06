import { Octokit } from '@octokit/rest';

const NOT_CONFIGURED = Object.freeze({
  ok: false,
  data: null,
  error: 'GitHub not configured. Set GITHUB_TOKEN environment variable.',
  notConfigured: true,
});

function parseOwnerRepo(repo) {
  const [owner, name] = String(repo).split('/');
  if (!owner || !name) throw new Error(`Invalid repo format: ${repo}. Expected "owner/repo".`);
  return { owner, repo: name };
}

function normalizePR(pr) {
  return {
    number: pr.number,
    title: pr.title,
    author: pr.user ? { login: pr.user.login, avatar: pr.user.avatar_url } : null,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at ?? null,
    url: pr.html_url,
    headRefName: pr.head?.ref,
    baseRefName: pr.base?.ref,
    headSha: pr.head?.sha ?? null,
    state: pr.state,
    isDraft: pr.draft,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    labels: (pr.labels || []).map(l => ({ name: l.name, color: l.color })),
    body: pr.body,
    commits: pr.commits,
    comments: pr.comments,
  };
}

function normalizeIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    author: issue.user ? { login: issue.user.login } : null,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    url: issue.html_url,
    state: issue.state,
    body: issue.body,
    labels: (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name)),
    assignees: (issue.assignees || []).map(a => ({ login: a.login })),
    comments: issue.comments,
  };
}

function normalizeRepo(repo) {
  return {
    name: repo.name,
    nameWithOwner: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    isPrivate: repo.private,
    isFork: repo.fork,
    pushedAt: repo.pushed_at,
    primaryLanguage: repo.language ? { name: repo.language } : null,
    stargazerCount: repo.stargazers_count,
  };
}

function deriveReviewDecision(reviews, requestedReviewers) {
  if ((reviews || []).some(r => r.state === 'CHANGES_REQUESTED')) return 'CHANGES_REQUESTED';
  if ((reviews || []).some(r => r.state === 'APPROVED')) return 'APPROVED';
  if ((requestedReviewers || []).length > 0) return 'REVIEW_REQUIRED';
  return '';
}

export class GitHubGateway {
  constructor({ token } = {}) {
    this._token = token || null;
    this._octokit = this._token ? new Octokit({ auth: this._token }) : null;
  }

  get configured() {
    return !!this._token;
  }

  async getDefaultBranch({ owner, repo } = {}) {
    if (!this._octokit) return { ...NOT_CONFIGURED, branch: null };
    try {
      const { data } = await this._octokit.repos.get({ owner, repo });
      return { ok: true, data, branch: data.default_branch || null };
    } catch (err) {
      return { ok: false, data: null, error: err.message, branch: null };
    }
  }

  async listPullRequests({ repo, state = 'open', limit = 20 } = {}) {
    if (!this._octokit) return NOT_CONFIGURED;
    try {
      const { owner, repo: repoName } = parseOwnerRepo(repo);
      const apiState = state === 'all' ? 'all' : state === 'closed' ? 'closed' : 'open';
      const { data } = await this._octokit.pulls.list({
        owner,
        repo: repoName,
        state: apiState,
        per_page: Math.min(limit, 100),
      });
      return { ok: true, data: data.map(normalizePR) };
    } catch (err) {
      return { ok: false, data: null, error: err.message };
    }
  }

  async viewPullRequest({ repo, number } = {}) {
    if (!this._octokit) return NOT_CONFIGURED;
    try {
      const { owner, repo: repoName } = parseOwnerRepo(repo);
      const prNum = Number(number);
      const [{ data: pr }, reviewsRes, filesRes] = await Promise.all([
        this._octokit.pulls.get({ owner, repo: repoName, pull_number: prNum }),
        this._octokit.pulls.listReviews({ owner, repo: repoName, pull_number: prNum }).catch(() => ({ data: [] })),
        this._octokit.pulls.listFiles({ owner, repo: repoName, pull_number: prNum }).catch(() => ({ data: [] })),
      ]);
      const reviews = reviewsRes.data || [];
      const files = filesRes.data || [];
      return {
        ok: true,
        data: {
          ...normalizePR(pr),
          reviewDecision: deriveReviewDecision(reviews, pr.requested_reviewers),
          reviews: reviews.map(r => ({ id: r.id, user: r.user?.login, state: r.state, body: r.body, submittedAt: r.submitted_at })),
          files: files.map(f => ({ filename: f.filename, additions: f.additions, deletions: f.deletions, status: f.status })),
        },
      };
    } catch (err) {
      return { ok: false, data: null, error: err.message };
    }
  }

  async listIssues({ repo, state = 'open', limit = 30 } = {}) {
    if (!this._octokit) return NOT_CONFIGURED;
    try {
      const { owner, repo: repoName } = parseOwnerRepo(repo);
      const { data } = await this._octokit.issues.listForRepo({
        owner,
        repo: repoName,
        state,
        per_page: Math.min(limit, 100),
        // exclude PRs (GitHub issues API returns both)
        filter: 'all',
      });
      // Filter out pull requests — GitHub issues API includes them
      const issues = data.filter(i => !i.pull_request);
      return { ok: true, data: issues.map(normalizeIssue) };
    } catch (err) {
      return { ok: false, data: null, error: err.message };
    }
  }

  async viewIssue({ repo, number } = {}) {
    if (!this._octokit) return NOT_CONFIGURED;
    try {
      const { owner, repo: repoName } = parseOwnerRepo(repo);
      const { data } = await this._octokit.issues.get({ owner, repo: repoName, issue_number: Number(number) });
      return { ok: true, data: normalizeIssue(data) };
    } catch (err) {
      return { ok: false, data: null, error: err.message };
    }
  }

  async listPullRequestComments({ owner, repo, number } = {}) {
    if (!this._octokit) return NOT_CONFIGURED;
    try {
      const { owner: ownerName, repo: repoName } = parseOwnerRepo(`${owner}/${repo}`);
      const { data } = await this._octokit.issues.listComments({
        owner: ownerName, repo: repoName, issue_number: Number(number), per_page: 100,
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, data: null, error: err.message };
    }
  }

  async listCheckRuns({ owner, repo, ref } = {}) {
    if (!this._octokit) return NOT_CONFIGURED;
    try {
      const { owner: ownerName, repo: repoName } = parseOwnerRepo(`${owner}/${repo}`);
      const { data } = await this._octokit.checks.listForRef({
        owner: ownerName, repo: repoName, ref, per_page: 100,
      });
      return { ok: true, data: data.check_runs };
    } catch (err) {
      return { ok: false, data: null, error: err.message };
    }
  }

  async listRepos({ limit = 100, visibility } = {}) {
    if (!this._octokit) return NOT_CONFIGURED;
    try {
      const params = { per_page: Math.min(limit, 100), sort: 'pushed', direction: 'desc' };
      if (visibility && visibility !== 'all') {
        params.visibility = visibility;
      }
      const { data } = await this._octokit.repos.listForAuthenticatedUser(params);
      return { ok: true, data: data.map(normalizeRepo) };
    } catch (err) {
      return { ok: false, data: null, error: err.message };
    }
  }
}
