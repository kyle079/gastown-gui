/**
 * Terminal routes — PTY-over-WebSocket bridge to gt tmux sessions.
 *
 * GET /api/terminal/sessions  — list attachable sessions on the gt socket
 * WS  /ws/terminal?session=<name> — attach to a session via node-pty
 *
 * SECURITY: this is a browser shell into live agent sessions. The app has
 * no authentication (see gg-2wt). Keep HOST bound to 127.0.0.1 (default) or
 * a trusted LAN interface only. Do not expose publicly.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import pty from 'node-pty';

const execFileAsync = promisify(execFile);

/**
 * Detect the gt tmux socket name by inspecting running tmux processes.
 * gt launches sessions with `tmux -L gt-<id> ...`; we extract the -L value.
 * Returns e.g. "gt-3d4168" or null if no gt socket found.
 */
async function detectGtSocket() {
  try {
    const { stdout } = await execFileAsync('ps', ['ax', '-o', 'args'], { timeout: 5000 });
    for (const line of stdout.split('\n')) {
      if (!line.includes('tmux')) continue;
      const m = line.match(/-L\s+(gt-[a-zA-Z0-9]+)/);
      if (m) return m[1];
    }
  } catch {
    // ignore
  }
  return null;
}

/** Role labels for session name prefixes (rig-role format). */
const ROLE_ORDER = ['mayor', 'witness', 'refinery', 'deacon', 'dog', 'chrome', 'polecat'];

function roleFromSession(name) {
  const lc = name.toLowerCase();
  if (lc.includes('mayor')) return 'mayor';
  if (lc.includes('witness')) return 'witness';
  if (lc.includes('refinery')) return 'refinery';
  if (lc.includes('deacon')) return 'deacon';
  if (lc.includes('dog')) return 'dog';
  if (lc.includes('chrome')) return 'chrome';
  // polecats: gg-nitro, gg-chrome, rh-jasper, etc.
  // anything else we classify as polecat
  return 'polecat';
}

function rigFromSession(name) {
  // Session names are like "hq-mayor", "gg-nitro", "lo-deathclaw"
  const parts = name.split('-');
  return parts[0] ?? name;
}

/**
 * Parse `tmux ls` output into session objects.
 * Format: "session-name: N windows (created ...)"
 */
function parseTmuxSessions(output) {
  const sessions = [];
  for (const line of output.split('\n')) {
    const m = line.match(/^([^:]+):/);
    if (m) {
      const name = m[1].trim();
      sessions.push({
        name,
        role: roleFromSession(name),
        rig: rigFromSession(name),
        label: name,
      });
    }
  }
  return sessions;
}

/**
 * Group sessions by role, sorted by role order then name.
 */
function groupSessions(sessions) {
  const groups = {};
  for (const s of sessions) {
    if (!groups[s.role]) groups[s.role] = [];
    groups[s.role].push(s);
  }
  const result = [];
  for (const role of ROLE_ORDER) {
    if (groups[role]) {
      result.push({
        role,
        sessions: groups[role].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  }
  // Any roles not in ROLE_ORDER
  for (const [role, sessions] of Object.entries(groups)) {
    if (!ROLE_ORDER.includes(role)) {
      result.push({ role, sessions });
    }
  }
  return result;
}

export function registerTerminalRoutes(app, { wss }) {
  // GET /api/terminal/sessions
  app.get('/api/terminal/sessions', async (req, res) => {
    try {
      const socket = await detectGtSocket();
      if (!socket) {
        return res.json({ sessions: [], groups: [], socket: null, warning: 'No gt tmux socket detected' });
      }

      const { stdout } = await execFileAsync('tmux', ['-L', socket, 'ls'], { timeout: 5000 });
      const sessions = parseTmuxSessions(stdout);
      const groups = groupSessions(sessions);

      res.json({ sessions, groups, socket });
    } catch (err) {
      // tmux ls exits non-zero if no sessions exist
      if (String(err.stderr || err.message).includes('no server running')) {
        return res.json({ sessions: [], groups: [], socket: null });
      }
      console.error('[Terminal] sessions error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // WebSocket handler for /ws/terminal?session=<name>
  // Registered on the shared wss; we route by URL path prefix.
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'ws://localhost');
    if (url.pathname !== '/ws/terminal') return;

    const sessionName = url.searchParams.get('session');
    if (!sessionName) {
      ws.send(JSON.stringify({ type: 'error', message: 'session parameter required' }));
      ws.close(1008, 'session parameter required');
      return;
    }

    // Sanitize session name — only allow alphanumeric, hyphens, underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionName)) {
      ws.send(JSON.stringify({ type: 'error', message: 'invalid session name' }));
      ws.close(1008, 'invalid session name');
      return;
    }

    let ptyProcess = null;

    async function attachSession() {
      const socket = await detectGtSocket();
      if (!socket) {
        ws.send(JSON.stringify({ type: 'error', message: 'No gt tmux socket found' }));
        ws.close(1011, 'no socket');
        return;
      }

      // Verify session exists
      try {
        await execFileAsync('tmux', ['-L', socket, 'has-session', '-t', sessionName], { timeout: 3000 });
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: `Session "${sessionName}" not found` }));
        ws.close(1011, 'session not found');
        return;
      }

      console.log(`[Terminal] Attaching to ${sessionName} via socket ${socket}`);

      // Spawn PTY with tmux attach
      ptyProcess = pty.spawn('tmux', ['-L', socket, 'attach-session', '-t', sessionName], {
        name: 'xterm-256color',
        cols: 220,
        rows: 50,
        env: { ...process.env, TERM: 'xterm-256color' },
      });

      ws.send(JSON.stringify({ type: 'ready', session: sessionName, socket }));

      ptyProcess.onData((data) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'output', data }));
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        console.log(`[Terminal] PTY exited for ${sessionName} (code ${exitCode})`);
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
          ws.close(1000, 'session ended');
        }
      });
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'input' && ptyProcess) {
          ptyProcess.write(msg.data);
        } else if (msg.type === 'resize' && ptyProcess) {
          const cols = Math.max(10, Math.min(1000, parseInt(msg.cols, 10) || 80));
          const rows = Math.max(2, Math.min(500, parseInt(msg.rows, 10) || 24));
          ptyProcess.resize(cols, rows);
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      console.log(`[Terminal] Client disconnected from ${sessionName}`);
      if (ptyProcess) {
        try { ptyProcess.kill(); } catch {}
        ptyProcess = null;
      }
    });

    ws.on('error', (err) => {
      console.error(`[Terminal] WS error for ${sessionName}:`, err.message);
      if (ptyProcess) {
        try { ptyProcess.kill(); } catch {}
        ptyProcess = null;
      }
    });

    // Start the attachment
    attachSession().catch((err) => {
      console.error('[Terminal] attach error:', err.message);
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
        ws.close(1011, 'attach failed');
      }
    });
  });
}
