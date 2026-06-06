/**
 * Gas Town GUI - GitHub Pull Requests Component
 *
 * Displays GitHub PRs across all connected rigs.
 */

import { api } from '../api.js';
import { showToast } from './toast.js';
import { state } from '../state.js';
import { getGitHubBackedRigs } from '../shared/github-repos.js';
import { formatRelativeTime } from '../utils/formatting.js';
import { escapeHtml } from '../utils/html.js';
import { getAuthStatus } from './github-auth.js';

// State
let currentState = 'open';
let prs = [];

/**
 * Initialize the PR list component
 */
export function initPRList() {
  // Set up filter tabs
  const filterTabs = document.querySelectorAll('.pr-state-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const state = tab.dataset.state;
      setActiveState(state);
    });
  });

  // Set up refresh button
  const refreshBtn = document.getElementById('pr-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadPRs());
  }
}

/**
 * Set active filter state
 */
function setActiveState(state) {
  currentState = state;

  // Update tabs
  document.querySelectorAll('.pr-state-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.state === state);
  });

  loadPRs();
}

/**
 * Load PRs from API
 */
export async function loadPRs() {
  const container = document.getElementById('pr-list-container');
  if (!container) return;

  container.innerHTML = '<div class="loading-state"><span class="loading-spinner"></span> Loading PRs...</div>';

  try {
    const gitHubRigs = await getAvailableGitHubRigs();
    if (gitHubRigs.length === 0) {
      renderNonGitHubState(container, 'pull requests');
      return;
    }

    prs = await api.getGitHubPRs(currentState);

    if (prs.length === 0) {
      const authStatus = getAuthStatus();
      const notConnected = authStatus?.configured && !authStatus?.connected;
      if (notConnected) {
        container.innerHTML = `
          <div class="empty-state enhanced">
            <div class="empty-state-icon-wrapper">
              <span class="material-icons">login</span>
            </div>
            <h3>Sign in with GitHub to view pull requests</h3>
            <p>Connect your GitHub account to see pull requests and rich PR data across your rigs.</p>
            <div class="empty-state-actions">
              <a class="btn btn-primary" href="/auth/github">
                <span class="material-icons" style="vertical-align:middle;font-size:16px">login</span>
                Sign in with GitHub
              </a>
            </div>
          </div>
        `;
        return;
      }
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-icons">merge_type</span>
          <p>No ${currentState} pull requests found</p>
          <small>No pull request records were returned by the configured review integration.</small>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    prs.forEach(pr => {
      container.appendChild(createPRCard(pr));
    });
  } catch (err) {
    console.error('[PRList] Failed to load PRs:', err);
    container.innerHTML = `
      <div class="error-state">
        <span class="material-icons">error</span>
        <p>Failed to load PRs</p>
        <small>${escapeHtml(err.message)}</small>
      </div>
    `;
  }
}

async function getAvailableGitHubRigs() {
  const cachedStatus = state.get('status');
  if (cachedStatus?.rigs?.length) {
    return getGitHubBackedRigs(cachedStatus);
  }

  const status = await api.getStatus();
  return getGitHubBackedRigs(status);
}

function renderNonGitHubState(container, resourceLabel) {
  container.innerHTML = `
    <div class="empty-state enhanced non-github-state">
      <div class="empty-state-icon-wrapper">
        <span class="material-icons">alt_route</span>
      </div>
      <h3>No review integration configured</h3>
      <p>This town currently exposes git remotes and worktrees only, so ${resourceLabel} are not available in this view.</p>
      <div class="empty-state-actions">
        <button class="btn btn-primary" data-navigate-view="rigs">
          <span class="material-icons">folder_special</span>
          Review Rigs
        </button>
        <button class="btn btn-secondary" data-navigate-view="work">
          <span class="material-icons">task_alt</span>
          Open Work
        </button>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-navigate-view]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector(`[data-view="${button.dataset.navigateView}"]`)?.click();
    });
  });
}

/**
 * Create a PR card element
 */
function createPRCard(pr) {
  const card = document.createElement('div');
  card.className = 'pr-card';
  card.dataset.prNumber = pr.number;
  card.dataset.repo = pr.repo;

  const stateIcon = getStateIcon(pr);
  const reviewIcon = getReviewIcon(pr.reviewDecision);
  const authorName = pr.author?.login || 'unknown';
  const timeAgo = formatRelativeTime(pr.updatedAt);

  card.innerHTML = `
    <div class="pr-icon ${pr.state.toLowerCase()} ${pr.isDraft ? 'draft' : ''}">
      <span class="material-icons">${stateIcon}</span>
    </div>
    <div class="pr-content">
      <div class="pr-header">
        <span class="pr-number">#${pr.number}</span>
        <span class="pr-title">${escapeHtml(pr.title)}</span>
        ${pr.isDraft ? '<span class="pr-draft-badge">Draft</span>' : ''}
      </div>
      <div class="pr-meta">
        <span class="pr-repo" title="Repository">
          <span class="material-icons">folder</span>
          ${escapeHtml(pr.rig)}
        </span>
        <span class="pr-branch" title="Branch">
          <span class="material-icons">account_tree</span>
          ${escapeHtml(pr.headRefName)}
        </span>
        <span class="pr-author" title="Author">
          <span class="material-icons">person</span>
          ${escapeHtml(authorName)}
        </span>
        <span class="pr-time" title="Last updated">
          <span class="material-icons">schedule</span>
          ${timeAgo}
        </span>
        ${reviewIcon ? `<span class="pr-review ${pr.reviewDecision?.toLowerCase()}" title="Review status">${reviewIcon}</span>` : ''}
      </div>
    </div>
    <div class="pr-actions">
      <a href="${escapeHtml(pr.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-icon" title="View on GitHub" onclick="event.stopPropagation()">
        <span class="material-icons">open_in_new</span>
      </a>
    </div>
  `;

  // Click anywhere on card (except the external link) to open detail view
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.pr-actions')) {
      showPRDetail(pr);
    }
  });

  return card;
}

/**
 * Get icon for PR state
 */
function getStateIcon(pr) {
  if (pr.isDraft) return 'edit_note';
  switch (pr.state?.toUpperCase()) {
    case 'OPEN': return 'merge_type';
    case 'CLOSED': return 'close';
    case 'MERGED': return 'merge';
    default: return 'merge_type';
  }
}

/**
 * Get review status icon
 */
function getReviewIcon(reviewDecision) {
  switch (reviewDecision?.toUpperCase()) {
    case 'APPROVED':
      return '<span class="material-icons approved">check_circle</span>';
    case 'CHANGES_REQUESTED':
      return '<span class="material-icons changes-requested">change_circle</span>';
    case 'REVIEW_REQUIRED':
      return '<span class="material-icons review-required">pending</span>';
    default:
      return null;
  }
}

/**
 * Open PR detail modal — loads full content from backend
 */
async function showPRDetail(pr) {
  const modal = document.getElementById('pr-detail-modal');
  const overlay = document.getElementById('modal-overlay');
  if (!modal || !overlay) return;

  // Populate header from list data immediately (fast path)
  populatePRDetailHeader(pr);

  // Show modal with loading state
  document.getElementById('pr-detail-loading').classList.remove('hidden');
  document.getElementById('pr-detail-content').classList.add('hidden');
  document.getElementById('pr-detail-error').classList.add('hidden');

  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');

  // Load full PR detail
  try {
    const detail = await api.getGitHubPR(pr.repo, pr.number);
    populatePRDetailContent(detail, pr);
  } catch (err) {
    console.error('[PRDetail] Failed to load PR detail:', err);
    document.getElementById('pr-detail-loading').classList.add('hidden');
    const errorEl = document.getElementById('pr-detail-error');
    errorEl.textContent = `Failed to load PR details: ${err.message}`;
    errorEl.classList.remove('hidden');
  }
}

function populatePRDetailHeader(pr) {
  // Title and number
  document.getElementById('pr-detail-title').textContent = pr.title;
  document.getElementById('pr-detail-number').textContent = `#${pr.number}`;

  // State badge
  const badge = document.getElementById('pr-detail-state-badge');
  const state = pr.state?.toUpperCase() || 'OPEN';
  badge.textContent = pr.isDraft ? 'DRAFT' : state;
  badge.className = 'pr-detail-state-badge pr-state-' + state.toLowerCase();

  // Meta: author, branch, repo, date
  document.getElementById('pr-detail-author-text').textContent = pr.author?.login || '—';
  document.getElementById('pr-detail-branch-text').textContent = pr.headRefName || '—';
  document.getElementById('pr-detail-repo-text').textContent = pr.repo || '—';
  document.getElementById('pr-detail-dates-text').textContent = formatRelativeTime(pr.updatedAt);

  // Labels (may not be in list data)
  document.getElementById('pr-detail-labels').innerHTML = '';

  // GitHub link
  document.getElementById('pr-detail-github-link').href = pr.url || '#';
}

function populatePRDetailContent(detail, listPR) {
  // Update header with full detail data (may have more info)
  const title = detail.title || listPR.title;
  const state = detail.state?.toUpperCase() || listPR.state?.toUpperCase() || 'OPEN';
  const isDraft = detail.isDraft ?? listPR.isDraft;

  document.getElementById('pr-detail-title').textContent = title;
  document.getElementById('pr-detail-number').textContent = `#${detail.number || listPR.number}`;

  const badge = document.getElementById('pr-detail-state-badge');
  badge.textContent = isDraft ? 'DRAFT' : state;
  badge.className = 'pr-detail-state-badge pr-state-' + state.toLowerCase();

  document.getElementById('pr-detail-author-text').textContent = detail.author?.login || listPR.author?.login || '—';
  const branch = detail.headRefName || listPR.headRefName || '—';
  const base = detail.baseRefName || 'main';
  document.getElementById('pr-detail-branch-text').textContent = `${branch} → ${base}`;
  document.getElementById('pr-detail-repo-text').textContent = listPR.repo || '—';
  document.getElementById('pr-detail-dates-text').textContent = detail.updatedAt
    ? formatRelativeTime(detail.updatedAt) : '—';

  // Labels
  const labelsEl = document.getElementById('pr-detail-labels');
  const labels = detail.labels || [];
  labelsEl.innerHTML = labels.map(l =>
    `<span class="issue-label" style="background: #${escapeHtml(l.color || '6c757d')}">${escapeHtml(l.name)}</span>`
  ).join('');

  // GitHub link
  document.getElementById('pr-detail-github-link').href = detail.url || listPR.url || '#';

  // Description / body
  const descEl = document.getElementById('pr-detail-description');
  if (detail.body && detail.body.trim()) {
    descEl.innerHTML = renderMarkdown(detail.body);
  } else {
    descEl.innerHTML = '<em class="text-muted">No description provided.</em>';
  }

  // Files changed
  const filesSection = document.getElementById('pr-detail-files-section');
  const filesEl = document.getElementById('pr-detail-files');
  const statsEl = document.getElementById('pr-detail-stats');
  const files = detail.files || [];
  const additions = detail.additions ?? 0;
  const deletions = detail.deletions ?? 0;

  if (files.length > 0) {
    statsEl.innerHTML = `<span class="pr-stat-add">+${additions}</span> <span class="pr-stat-del">-${deletions}</span> · ${files.length} file${files.length !== 1 ? 's' : ''}`;
    filesEl.innerHTML = files.map(f => `
      <div class="pr-file-item">
        <span class="pr-file-change-type pr-change-${(f.changeType || 'modified').toLowerCase()}">${getChangeTypeLabel(f.changeType)}</span>
        <span class="pr-file-path">${escapeHtml(f.path)}</span>
        <span class="pr-file-stats">
          <span class="pr-stat-add">+${f.additions || 0}</span>
          <span class="pr-stat-del">-${f.deletions || 0}</span>
        </span>
      </div>
    `).join('');
    filesSection.classList.remove('hidden');
  } else {
    filesSection.classList.add('hidden');
  }

  // Commits
  const commitsSection = document.getElementById('pr-detail-commits-section');
  const commitsEl = document.getElementById('pr-detail-commits');
  const commits = detail.commits || [];
  if (commits.length > 0) {
    commitsEl.innerHTML = commits.map(c => {
      const authorLogin = (c.authors || [])[0]?.login || (c.authors || [])[0]?.name || '?';
      const sha = (c.oid || '').substring(0, 7);
      return `
        <div class="pr-commit-item">
          <span class="pr-commit-sha">${escapeHtml(sha)}</span>
          <span class="pr-commit-msg">${escapeHtml(c.messageHeadline || '')}</span>
          <span class="pr-commit-author">${escapeHtml(authorLogin)}</span>
        </div>
      `;
    }).join('');
    commitsSection.classList.remove('hidden');
  } else {
    commitsSection.classList.add('hidden');
  }

  // Reviews
  const reviewsSection = document.getElementById('pr-detail-reviews-section');
  const reviewsEl = document.getElementById('pr-detail-reviews');
  const reviews = detail.reviews || [];
  if (reviews.length > 0) {
    reviewsEl.innerHTML = reviews.map(r => `
      <div class="pr-review-item pr-review-${(r.state || '').toLowerCase()}">
        <div class="pr-review-header">
          <span class="pr-review-author">${escapeHtml(r.author?.login || '?')}</span>
          <span class="pr-review-state-badge">${getReviewStateLabel(r.state)}</span>
          <span class="pr-review-time">${r.submittedAt ? formatRelativeTime(r.submittedAt) : ''}</span>
        </div>
        ${r.body ? `<div class="pr-review-body">${renderMarkdown(r.body)}</div>` : ''}
      </div>
    `).join('');
    reviewsSection.classList.remove('hidden');
  } else {
    reviewsSection.classList.add('hidden');
  }

  // Comments
  const commentsSection = document.getElementById('pr-detail-comments-section');
  const commentsEl = document.getElementById('pr-detail-comments');
  const comments = detail.comments || [];
  if (comments.length > 0) {
    commentsEl.innerHTML = comments.map(c => `
      <div class="pr-comment-item">
        <div class="pr-comment-header">
          <span class="pr-comment-author">${escapeHtml(c.author?.login || '?')}</span>
          <span class="pr-comment-time">${c.createdAt ? formatRelativeTime(c.createdAt) : ''}</span>
        </div>
        <div class="pr-comment-body">${renderMarkdown(c.body || '')}</div>
      </div>
    `).join('');
    commentsSection.classList.remove('hidden');
  } else {
    commentsSection.classList.add('hidden');
  }

  // Show content, hide loading
  document.getElementById('pr-detail-loading').classList.add('hidden');
  document.getElementById('pr-detail-content').classList.remove('hidden');
}

function getChangeTypeLabel(changeType) {
  switch ((changeType || '').toUpperCase()) {
    case 'ADDED': return 'A';
    case 'DELETED': return 'D';
    case 'RENAMED': return 'R';
    case 'COPIED': return 'C';
    default: return 'M';
  }
}

function getReviewStateLabel(state) {
  switch ((state || '').toUpperCase()) {
    case 'APPROVED': return '✓ Approved';
    case 'CHANGES_REQUESTED': return '↻ Changes requested';
    case 'COMMENTED': return '💬 Commented';
    case 'DISMISSED': return '— Dismissed';
    default: return state || '';
  }
}

/**
 * Minimal safe markdown renderer.
 * Escapes HTML first, then applies markdown patterns.
 */
function renderMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return '';

  const lines = raw.split('\n');
  const output = [];
  let inFence = false;
  let fenceContent = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inFence) {
        output.push(`<pre class="md-code"><code>${escapeHtml(fenceContent.join('\n'))}</code></pre>`);
        fenceContent = [];
        inFence = false;
      } else {
        if (inList) { output.push('</ul>'); inList = false; }
        inFence = true;
      }
      continue;
    }

    if (inFence) {
      fenceContent.push(line);
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      if (inList) { output.push('</ul>'); inList = false; }
      const level = Math.min(hMatch[1].length + 2, 6); // h3-h6 to avoid clashing with modal h2/h3
      output.push(`<h${level} class="md-heading">${inlineMarkdown(hMatch[2])}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push('<hr class="md-hr">');
      continue;
    }

    // List item
    const listMatch = line.match(/^[-*]\s+(.+)/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)/);
    if (listMatch || orderedMatch) {
      if (!inList) { output.push('<ul class="md-list">'); inList = true; }
      output.push(`<li>${inlineMarkdown((listMatch || orderedMatch)[1])}</li>`);
      continue;
    }

    if (inList) { output.push('</ul>'); inList = false; }

    // Empty line = paragraph break
    if (line.trim() === '') {
      output.push('<div class="md-spacer"></div>');
      continue;
    }

    // Blockquote
    const quoteMatch = line.match(/^>\s*(.*)/);
    if (quoteMatch) {
      output.push(`<blockquote class="md-blockquote">${inlineMarkdown(quoteMatch[1])}</blockquote>`);
      continue;
    }

    output.push(`<p class="md-p">${inlineMarkdown(line)}</p>`);
  }

  if (inFence && fenceContent.length) {
    output.push(`<pre class="md-code"><code>${escapeHtml(fenceContent.join('\n'))}</code></pre>`);
  }
  if (inList) output.push('</ul>');

  return output.join('');
}

function inlineMarkdown(text) {
  // Escape HTML
  let html = escapeHtml(text);

  // Inline code (before bold/italic to avoid conflicts)
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links — only http/https for safety
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    (_, linkText, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
  );

  // Bare URLs
  html = html.replace(
    /(^|[\s(])(https?:\/\/[^\s<>"]+)/g,
    (_, before, url) => `${before}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );

  return html;
}

/**
 * Render PR list (called from app.js after data load)
 */
export function renderPRList(prData) {
  prs = prData || [];

  const container = document.getElementById('pr-list-container');
  if (!container) return;

  if (prs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">merge_type</span>
        <p>No pull requests found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  prs.forEach(pr => {
    container.appendChild(createPRCard(pr));
  });
}
