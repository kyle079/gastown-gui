export function registerGitHubRoutes(app, { gitHubService } = {}) {
  if (!gitHubService) throw new Error('registerGitHubRoutes requires gitHubService');

  app.get('/api/github/prs', async (req, res) => {
    try {
      const state = req.query.state || 'open';
      const prs = await gitHubService.listPullRequests({ state, refresh: req.query.refresh === 'true' });
      res.json(prs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/pr/:repo/:number', async (req, res) => {
    try {
      const { repo, number } = req.params;
      const pr = await gitHubService.viewPullRequest({ repo, number, refresh: req.query.refresh === 'true' });
      res.json(pr);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/issues', async (req, res) => {
    try {
      const state = req.query.state || 'open';
      const issues = await gitHubService.listIssues({ state, refresh: req.query.refresh === 'true' });
      res.json(issues);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/issue/:repo/:number', async (req, res) => {
    try {
      const { repo, number } = req.params;
      const issue = await gitHubService.viewIssue({ repo, number });
      res.json(issue);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/github/repos', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 100;
      const visibility = req.query.visibility;

      const repos = await gitHubService.listRepos({
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

