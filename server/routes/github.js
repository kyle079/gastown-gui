import { GitHubService } from '../services/GitHubService.js';

export function registerGitHubRoutes(app, { gitHubService, gitHubGatewayFactory, statusService } = {}) {
  if (!gitHubService) throw new Error('registerGitHubRoutes requires gitHubService');

  // Returns a GitHubService scoped to the session OAuth token, or the shared service as fallback.
  function serviceFor(req) {
    const sessionToken = req.session?.githubToken;
    if (sessionToken && gitHubGatewayFactory) {
      return new GitHubService({ gitHubGateway: gitHubGatewayFactory(sessionToken), statusService });
    }
    return gitHubService;
  }

  app.get('/api/github/prs', async (req, res) => {
    try {
      const state = req.query.state || 'open';
      const prs = await serviceFor(req).listPullRequests({ state, refresh: req.query.refresh === 'true' });
      res.json(prs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/pr/:repo/:number', async (req, res) => {
    try {
      const { repo, number } = req.params;
      const pr = await serviceFor(req).viewPullRequest({ repo, number, refresh: req.query.refresh === 'true' });
      res.json(pr);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/issues', async (req, res) => {
    try {
      const state = req.query.state || 'open';
      const issues = await serviceFor(req).listIssues({ state, refresh: req.query.refresh === 'true' });
      res.json(issues);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/issue/:repo/:number', async (req, res) => {
    try {
      const { repo, number } = req.params;
      const issue = await serviceFor(req).viewIssue({ repo, number });
      res.json(issue);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/repos', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 100;
      const visibility = req.query.visibility;
      const repos = await serviceFor(req).listRepos({
        limit,
        visibility,
        refresh: req.query.refresh === 'true',
      });
      res.json(repos);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Token-based PR detail: owner and repo are separate path segments.
  app.get('/api/prs/:owner/:repo/:number', async (req, res) => {
    try {
      const { owner, repo, number } = req.params;
      const detail = await serviceFor(req).viewPullRequestDetail({
        owner,
        repo,
        number: parseInt(number, 10),
        refresh: req.query.refresh === 'true',
      });
      res.json(detail);
    } catch (err) {
      console.error('[API] Failed to fetch PR detail:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
