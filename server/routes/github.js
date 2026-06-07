import { GitHubService } from '../services/GitHubService.js';

export function registerGitHubRoutes(app, { gitHubService, gitHubGateway, statusService, cache } = {}) {
  if (!gitHubService) throw new Error('registerGitHubRoutes requires gitHubService');

  function serviceForRequest(req) {
    const userToken = req.session?.githubToken;
    if (!userToken) return gitHubService;
    // Create a per-request service using the logged-in user's OAuth token
    return new GitHubService({
      gitHubGateway: gitHubGateway.withToken(userToken),
      statusService,
      cache,
    });
  }

  app.get('/api/github/prs', async (req, res) => {
    try {
      const state = req.query.state || 'open';
      const prs = await serviceForRequest(req).listPullRequests({ state, refresh: req.query.refresh === 'true' });
      res.json(prs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/pr/:repo/:number', async (req, res) => {
    try {
      const { repo, number } = req.params;
      const pr = await serviceForRequest(req).viewPullRequest({ repo, number });
      res.json(pr);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/issues', async (req, res) => {
    try {
      const state = req.query.state || 'open';
      const issues = await serviceForRequest(req).listIssues({ state, refresh: req.query.refresh === 'true' });
      res.json(issues);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/issue/:repo/:number', async (req, res) => {
    try {
      const { repo, number } = req.params;
      const issue = await serviceForRequest(req).viewIssue({ repo, number });
      res.json(issue);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/repos', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 100;
      const visibility = req.query.visibility;

      const repos = await serviceForRequest(req).listRepos({
        limit,
        visibility,
        refresh: req.query.refresh === 'true',
      });
      res.json(repos);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
