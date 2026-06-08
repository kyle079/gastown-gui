import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const WEB_DIST_DIR = path.join(ROOT_DIR, 'web', 'dist');
const WEB_INDEX = path.join(WEB_DIST_DIR, 'index.html');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');

const now = Date.now();

const agents = [
  {
    name: 'topaz',
    address: 'gastown_gui/polecats/topaz',
    session: 'topaz-session',
    role: 'polecat',
    running: true,
    acp: true,
    has_work: true,
    state: 'working',
    unread_mail: 0,
    hook: 'gg-luc',
    hook_bead: 'gg-luc',
  },
  {
    name: 'witness',
    address: 'gastown_gui/witness',
    session: 'witness-session',
    role: 'witness',
    running: true,
    acp: true,
    has_work: false,
    state: 'idle',
    unread_mail: 1,
  },
  {
    name: 'refinery',
    address: 'gastown_gui/refinery',
    session: 'refinery-session',
    role: 'refinery',
    running: true,
    acp: true,
    has_work: true,
    state: 'working',
    unread_mail: 0,
  },
];

const rigs = [
  {
    name: 'gastown_gui',
    polecats: [agents[0]],
    polecat_count: 1,
    crews: [],
    crew_count: 0,
    has_witness: true,
    has_refinery: true,
    agents,
    git_url: 'https://github.com/web3dev1337/gastown-gui',
  },
];

const state = {
  status: {
    name: 'Test Town',
    location: 'east yard',
    overseer: {
      name: 'Kyle',
      email: 'kyle@example.com',
      username: 'kyle079',
      source: 'mock',
      unread_mail: 1,
    },
    daemon: { running: true, pid: 4242, port: 7667 },
    dolt: { running: true, port: 3307, data_dir: '/tmp/mock-dolt' },
    tmux: { running: true, session_count: 3, socket: '/tmp/mock-tmux.sock' },
    agents,
    rigs,
    summary: {
      rig_count: 1,
      polecat_count: 1,
      crew_count: 0,
      witness_count: 1,
      refinery_count: 1,
      active_hooks: 1,
    },
    runningPolecats: ['gastown_gui/polecats/topaz'],
  },
  convoys: [
    {
      id: 'convoy-alpha',
      title: 'Root e2e alignment',
      status: 'open',
      created_at: new Date(now - 60 * 60 * 1000).toISOString(),
      tracked: [
        { id: 'gg-luc', title: 'Fix root e2e suite', status: 'hooked', assignee: 'gastown_gui/polecats/topaz' },
        { id: 'gg-ui2', title: 'Remove legacy shell', status: 'closed' },
      ],
      completed: 1,
      total: 2,
    },
    {
      id: 'convoy-beta',
      title: 'Operator follow-up',
      status: 'open',
      created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      tracked: [
        { id: 'gg-rig', title: 'Audit fleet surface', status: 'open' },
      ],
      completed: 0,
      total: 1,
    },
  ],
  beads: [
    { id: 'gg-luc', title: 'Root e2e suite fails on current master', status: 'hooked', priority: 1, assignee: 'gastown_gui/polecats/topaz' },
    { id: 'gg-rig', title: 'Audit fleet surface', status: 'open', priority: 2 },
  ],
  mail: [
    {
      id: 'mail-1',
      from: 'gastown_gui/witness',
      to: 'gastown_gui/polecats/topaz',
      subject: 'Regression confirmed',
      message: 'The root browser suite still points at the removed shell.',
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
      read: false,
      priority: 'high',
    },
    {
      id: 'mail-2',
      from: 'mayor/',
      to: 'gastown_gui/polecats/topaz',
      subject: 'Hook attached',
      message: 'Proceed on gg-luc.',
      timestamp: new Date(now - 90 * 60 * 1000).toISOString(),
      read: true,
      priority: 'normal',
    },
  ],
  escalations: [
    {
      id: 'esc-1',
      title: 'MQ blocked on failing browser baseline',
      description: 'Root suite is red after the React-only delivery switch.',
      status: 'open',
      priority: 1,
      created_at: new Date(now - 45 * 60 * 1000).toISOString(),
      updated_at: new Date(now - 10 * 60 * 1000).toISOString(),
      labels: ['test', 'e2e'],
    },
  ],
  activity: [
    {
      id: 'evt-1',
      ts: new Date(now - 20 * 60 * 1000).toISOString(),
      type: 'session_start',
      actor: 'gastown_gui/polecats/topaz',
      source: 'topaz-session',
      payload: { branch: 'polecat/topaz/gg-luc@mq4hz1pd', bead: 'gg-luc' },
    },
    {
      id: 'evt-2',
      ts: new Date(now - 5 * 60 * 1000).toISOString(),
      type: 'mail',
      actor: 'gastown_gui/witness',
      source: 'witness-session',
      payload: { subject: 'Regression confirmed', to: 'gastown_gui/polecats/topaz' },
    },
  ],
  scheduler: {
    paused: false,
    queued_total: 2,
    queued_ready: 1,
    active_polecats: 1,
    capacity: {
      max: 4,
      working: 1,
      recovery_blocked: 0,
      reusable_idle: 1,
      pending_mr: 1,
      reservations: 0,
      free: 1,
      active_sessions: 3,
    },
    beads: [
      { id: 'gg-rig', title: 'Audit fleet surface', status: 'open', priority: 2 },
    ],
  },
  dogs: {
    dogs: [
      {
        name: 'amber',
        state: 'working',
        worktrees: { gastown_gui: '/tmp/gastown_gui-amber' },
      },
      {
        name: 'slate',
        state: 'idle',
        worktrees: {},
      },
    ],
    summary: {
      total: 2,
      idle: 1,
      working: 1,
      kennel_dir: '/tmp/mock-kennel',
    },
  },
  targets: [
    { id: 'gastown_gui/polecats/topaz', name: 'gastown_gui/polecats/topaz', type: 'agent', role: 'polecat', running: true, has_work: true },
    { id: 'gastown_gui', name: 'gastown_gui', type: 'rig', description: 'Auto-spawn polecat in gastown_gui' },
  ],
};

let httpServer;
let wss;

function broadcast(payload) {
  if (!wss) return;
  const frame = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(frame);
    }
  }
}

function recordActivity(type, payload, actor = 'test-harness') {
  const event = {
    id: `evt-${Date.now()}`,
    ts: new Date().toISOString(),
    type,
    actor,
    source: 'mock-server',
    payload,
  };
  state.activity.unshift(event);
  broadcast({ type: 'activity', data: event });
  return event;
}

export async function startMockServer({ port = 0 } = {}) {
  const app = express();
  app.use(express.json());

  app.use('/assets', express.static(ASSETS_DIR));
  app.use(express.static(WEB_DIST_DIR));

  app.get('/api/status', (_req, res) => res.json(state.status));
  app.get('/api/convoys', (_req, res) => res.json(state.convoys));
  app.get('/api/beads', (_req, res) => res.json(state.beads));
  app.get('/api/mail', (_req, res) => res.json(state.mail));
  app.get('/api/escalations', (_req, res) => res.json(state.escalations));
  app.get('/api/activity', (_req, res) => res.json({ items: state.activity, total: state.activity.length }));
  app.get('/api/changelog', (_req, res) => res.json([]));
  app.get('/api/scheduler/status', (_req, res) => res.json(state.scheduler));
  app.get('/api/dogs', (_req, res) => res.json(state.dogs));
  app.get('/api/targets', (_req, res) => res.json(state.targets));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.post('/api/sling', (req, res) => {
    recordActivity('sling', {
      bead: req.body?.bead ?? null,
      target: req.body?.target ?? null,
    });
    res.json({ success: true });
  });

  app.post('/api/mail', (req, res) => {
    const mail = {
      id: `mail-${Date.now()}`,
      from: 'operator/',
      to: req.body?.to ?? '',
      subject: req.body?.subject ?? '',
      message: req.body?.message ?? '',
      timestamp: new Date().toISOString(),
      read: true,
      priority: req.body?.priority ?? 'normal',
    };
    state.mail.unshift(mail);
    recordActivity('mail', { subject: mail.subject, to: mail.to }, 'operator/');
    res.json({ success: true, mail });
  });

  app.post('/api/escalations/:id/ack', (req, res) => {
    recordActivity('escalation_acked', { id: req.params.id });
    res.json({ success: true });
  });

  app.post('/api/escalations/:id/close', (req, res) => {
    recordActivity('escalation_closed', { id: req.params.id, reason: req.body?.reason ?? null });
    res.json({ success: true });
  });

  app.get('*', (_req, res) => {
    res.sendFile(WEB_INDEX);
  });

  httpServer = createServer(app);
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'activity', data: state.activity[0] }));
  });

  await new Promise((resolve) => {
    httpServer.listen(port, '127.0.0.1', resolve);
  });

  return httpServer;
}

export async function stopMockServer() {
  if (wss) {
    await new Promise((resolve) => wss.close(resolve));
    wss = undefined;
  }

  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    httpServer = undefined;
  }
}
