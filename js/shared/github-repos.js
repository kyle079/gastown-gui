/**
 * Gas Town GUI - GitHub Repo Mapping
 *
 * Configure this mapping to link beads/PRs to your GitHub repos.
 *
 * Format examples:
 * - Map rig names to GitHub repos: { 'my-rig': 'myorg/my-repo' }
 * - Map bead ID prefixes to repos: { 'hq': 'myorg/hq-repo' } (matches 'hq-123')
 */

export const GITHUB_REPOS = {
  // Example:
  // 'my-rig': 'myorg/my-repo',
  // 'hq': 'myorg/hq-repo',
};

/**
 * Get GitHub repo for a bead based on its ID or rig.
 * @param {string} beadId
 * @returns {string|null}
 */
export function getGitHubRepoForBead(beadId) {
  if (!beadId) return null;

  // Try to match by bead prefix (e.g., "hq-123" → "hq")
  const prefixMatch = beadId.match(/^([a-z]+)-/i);
  if (prefixMatch) {
    const prefix = prefixMatch[1].toLowerCase();
    if (GITHUB_REPOS[prefix]) return GITHUB_REPOS[prefix];
  }

  // Try to match by rig name directly
  for (const [key, repo] of Object.entries(GITHUB_REPOS)) {
    if (repo && beadId.toLowerCase().includes(key.toLowerCase())) {
      return repo;
    }
  }

  // Default: try the first available repo
  for (const repo of Object.values(GITHUB_REPOS)) {
    if (repo) return repo;
  }

  return null;
}

export function isGitHubRemote(url) {
  return /github\.com[:/]/i.test(String(url || ''));
}

export function getGitHubBackedRigs(statusOrRigs) {
  const rigs = Array.isArray(statusOrRigs)
    ? statusOrRigs
    : Array.isArray(statusOrRigs?.rigs)
      ? statusOrRigs.rigs
      : [];

  return rigs.filter(rig => isGitHubRemote(rig?.git_url));
}

