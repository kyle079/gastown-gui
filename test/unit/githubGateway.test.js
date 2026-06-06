import { describe, it, expect } from 'vitest';

import { GitHubGateway } from '../../server/gateways/GitHubGateway.js';

describe('GitHubGateway', () => {
  describe('not configured (no token)', () => {
    const gateway = new GitHubGateway({});

    it('configured is false', () => {
      expect(gateway.configured).toBe(false);
    });

    it('getDefaultBranch() returns notConfigured result', async () => {
      const result = await gateway.getDefaultBranch({ owner: 'o', repo: 'r' });
      expect(result.ok).toBe(false);
      expect(result.notConfigured).toBe(true);
      expect(result.branch).toBeNull();
    });

    it('listPullRequests() returns notConfigured result', async () => {
      const result = await gateway.listPullRequests({ repo: 'o/r' });
      expect(result.ok).toBe(false);
      expect(result.notConfigured).toBe(true);
      expect(result.data).toBeNull();
    });

    it('viewPullRequest() returns notConfigured result', async () => {
      const result = await gateway.viewPullRequest({ repo: 'o/r', number: 1 });
      expect(result.ok).toBe(false);
      expect(result.notConfigured).toBe(true);
    });

    it('listIssues() returns notConfigured result', async () => {
      const result = await gateway.listIssues({ repo: 'o/r' });
      expect(result.ok).toBe(false);
      expect(result.notConfigured).toBe(true);
    });

    it('viewIssue() returns notConfigured result', async () => {
      const result = await gateway.viewIssue({ repo: 'o/r', number: 1 });
      expect(result.ok).toBe(false);
      expect(result.notConfigured).toBe(true);
    });

    it('listRepos() returns notConfigured result', async () => {
      const result = await gateway.listRepos({});
      expect(result.ok).toBe(false);
      expect(result.notConfigured).toBe(true);
    });
  });

  describe('configured (with token)', () => {
    it('configured is true when token provided', () => {
      const gateway = new GitHubGateway({ token: 'ghp_fake' });
      expect(gateway.configured).toBe(true);
    });

    it('listPullRequests() returns error on API failure', async () => {
      const gateway = new GitHubGateway({ token: 'ghp_invalid_test_token' });
      const result = await gateway.listPullRequests({ repo: 'o/r', state: 'open', limit: 1 });
      expect(result.ok).toBe(false);
      expect(typeof result.error).toBe('string');
    });
  });
});
