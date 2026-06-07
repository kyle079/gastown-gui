import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createServer } from 'node:http';

import { createApp } from '../../server/app/createApp.js';
import { registerGitHubRoutes } from '../../server/routes/github.js';

describe('GitHub routes (real Express app)', () => {
  let server;
  let baseUrl;
  let calls;

  beforeAll(async () => {
    calls = [];
    const gitHubService = {
      listPullRequests: async (opts) => {
        calls.push(['listPullRequests', opts]);
        return [{ n: 1 }];
      },
      viewPullRequest: async (opts) => {
        calls.push(['viewPullRequest', opts]);
        return { n: 123 };
      },
      viewPullRequestDetail: async (opts) => {
        calls.push(['viewPullRequestDetail', opts]);
        return { number: opts.number, title: 'Detail PR', body: '', files: [], reviews: [], comments: [], checks: [] };
      },
      listIssues: async (opts) => {
        calls.push(['listIssues', opts]);
        return [{ n: 2 }];
      },
      viewIssue: async (opts) => {
        calls.push(['viewIssue', opts]);
        return { n: 456 };
      },
      listRepos: async (opts) => {
        calls.push(['listRepos', opts]);
        return [{ name: 'repo' }];
      },
    };

    const { app } = createApp({ allowedOrigins: ['*'] });
    registerGitHubRoutes(app, { gitHubService });

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /api/github/prs forwards query params', async () => {
    const res = await fetch(`${baseUrl}/api/github/prs?state=closed&refresh=true`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ n: 1 }]);

    expect(calls[0]).toEqual(['listPullRequests', { state: 'closed', refresh: true }]);
  });

  it('GET /api/github/pr/:repo/:number decodes repo param', async () => {
    const res = await fetch(`${baseUrl}/api/github/pr/acme%2Fone/123`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ n: 123 });

    expect(calls[1]).toEqual(['viewPullRequest', { repo: 'acme/one', number: '123', refresh: false }]);
  });

  it('GET /api/prs/:owner/:repo/:number returns PR detail', async () => {
    const res = await fetch(`${baseUrl}/api/prs/acme/one/42`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.number).toBe(42);
    expect(body.title).toBe('Detail PR');

    const detailCall = calls.find(([method]) => method === 'viewPullRequestDetail');
    expect(detailCall).toBeDefined();
    expect(detailCall[1]).toMatchObject({ owner: 'acme', repo: 'one', number: 42, refresh: false });
  });

  it('GET /api/github/repos forwards limit/visibility', async () => {
    const res = await fetch(`${baseUrl}/api/github/repos?limit=25&visibility=private`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ name: 'repo' }]);

    const reposCall = calls.find(([method]) => method === 'listRepos');
    expect(reposCall).toBeDefined();
    expect(reposCall[1]).toEqual({ limit: 25, visibility: 'private', refresh: false });
  });
});

