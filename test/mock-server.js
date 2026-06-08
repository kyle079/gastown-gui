import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
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

const formulas = [
  { name: 'fix-bug', description: 'Patch a focused bug quickly', template: 'Investigate ${issue} and land the fix.' },
  { name: 'deep-dive', description: 'Thorough analysis workflow', template: 'Study ${topic}, collect evidence, and report findings.' },
];

const githubRepos = [
  { name: 'gastown', url: 'https://github.com/web3dev1337/gastown' },
  { name: 'gastown-gui', url: 'https://github.com/web3dev1337/gastown-gui' },
];

const crews = [
  { name: 'backend-team', rig: 'zoo-game', members: ['opal', 'slate'], status: 'active' },
  { name: 'frontend-team', rig: 'gastown_gui', members: ['topaz'], status: 'active' },
];

const mayorMessages = [
  { id: 1, type: 'user', content: 'Build a new feature', timestamp: new Date(now - 60_000).toISOString() },
  { id: 2, type: 'assistant', content: 'I will create a convoy for that task.', timestamp: new Date(now - 30_000).toISOString() },
];

const serviceState = new Map([
  ['mayor', { name: 'mayor', status: 'running' }],
  ['deacon', { name: 'deacon', status: 'running' }],
  ['witness:my-rig', { name: 'witness', status: 'running', rig: 'my-rig' }],
  ['refinery:my-rig', { name: 'refinery', status: 'stopped', rig: 'my-rig' }],
]);

const polecats = new Map([
  ['zoo-game/polecat-1', { rig: 'zoo-game', name: 'polecat-1', status: 'running', started: new Date(now - 45 * 60_000).toISOString() }],
  ['gastown/worker-1', { rig: 'gastown', name: 'worker-1', status: 'idle', started: new Date(now - 90 * 60_000).toISOString() }],
]);

const mockRigs = [
  { name: 'zoo-game', path: '/home/user/gt/zoo-game', url: 'https://github.com/web3dev1337/zoo-game', status: 'active' },
  { name: 'gastown', path: '/home/user/gt/gastown', url: 'https://github.com/steveyegge/gastown', status: 'active' },
];

const agents = [
  {
    id: 'agent-1',
    name: 'topaz',
    role: 'polecat',
    status: 'working',
    address: 'gastown_gui/polecats/topaz',
    session: 'topaz-session',
    running: true,
    acp: true,
    has_work: true,
    state: 'working',
    unread_mail: 0,
    hook: 'gg-luc',
    hook_bead: 'gg-luc',
  },
  {
    id: 'agent-2',
    name: 'witness',
    role: 'witness',
    status: 'idle',
    address: 'gastown_gui/witness',
    session: 'witness-session',
    running: true,
    acp: true,
    has_work: false,
    state: 'idle',
    unread_mail: 1,
  },
  {
    id: 'agent-3',
    name: 'refinery',
    role: 'refinery',
    status: 'working',
    address: 'gastown_gui/refinery',
    session: 'refinery-session',
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

const beads = [
  { id: 'gg-luc', title: 'Root e2e suite fails on current master', status: 'hooked', priority: 1, assignee: 'gastown_gui/polecats/topaz', labels: ['test'] },
  { id: 'bead-1', title: 'Fix login redirect', status: 'open', priority: 1, assignee: null, labels: ['bug'] },
  { id: 'bead-2', title: 'Database migration script', status: 'blocked', priority: 2, assignee: 'polecat-1', labels: ['infra'] },
];

const state = {
  status: {
    name: 'Test Town',
    version: '0.1.0',
    location: 'east yard',
    hook: null,
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
    convoy_count: 2,
    active_agents: 1,
    pending_tasks: 3,
    runningPolecats: ['gastown_gui/polecats/topaz'],
  },
  convoys: [
    {
      id: 'convoy-alpha',
      name: 'Root e2e alignment',
      title: 'Root e2e alignment',
      status: 'open',
      priority: 'high',
      issues: [{ title: 'Fix root e2e suite' }],
      progress: 0.5,
      created_at: new Date(now - 60 * 60_000).toISOString(),
      agent_count: 1,
      task_count: 2,
      tracked: [
        { id: 'gg-luc', title: 'Fix root e2e suite', status: 'hooked', assignee: 'gastown_gui/polecats/topaz' },
        { id: 'gg-ui2', title: 'Remove legacy shell', status: 'closed' },
      ],
      completed: 1,
      total: 2,
    },
    {
      id: 'convoy-beta',
      name: 'Operator follow-up',
      title: 'Operator follow-up',
      status: 'open',
      priority: 'normal',
      issues: [{ title: 'Audit fleet surface' }],
      progress: 0,
      created_at: new Date(now - 2 * 60 * 60_000).toISOString(),
      agent_count: 0,
      task_count: 1,
      tracked: [
        { id: 'gg-rig', title: 'Audit fleet surface', status: 'open' },
      ],
      completed: 0,
      total: 1,
    },
  ],
  mail: [
    {
      id: 'mail-1',
      from: 'gastown_gui/witness',
      to: 'gastown_gui/polecats/topaz',
      subject: 'Regression confirmed',
      message: 'The root browser suite still points at the removed shell.',
      timestamp: new Date(now - 30 * 60_000).toISOString(),
      read: false,
      priority: 'high',
    },
    {
      id: 'mail-2',
      from: 'mayor/',
      to: 'gastown_gui/polecats/topaz',
      subject: 'Hook attached',
      message: 'Proceed on gg-luc.',
      timestamp: new Date(now - 90 * 60_000).toISOString(),
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
      created_at: new Date(now - 45 * 60_000).toISOString(),
      updated_at: new Date(now - 10 * 60_000).toISOString(),
      labels: ['test', 'e2e'],
    },
  ],
  activity: [
    {
      id: 'evt-1',
      ts: new Date(now - 20 * 60_000).toISOString(),
      type: 'session_start',
      actor: 'gastown_gui/polecats/topaz',
      source: 'topaz-session',
      payload: { branch: 'polecat/topaz/gg-luc@mq4hz1pd', bead: 'gg-luc' },
    },
    {
      id: 'evt-2',
      ts: new Date(now - 5 * 60_000).toISOString(),
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
      { name: 'amber', state: 'working', worktrees: { gastown_gui: '/tmp/gastown_gui-amber' } },
      { name: 'slate', state: 'idle', worktrees: {} },
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

function findConvoy(id) {
  return state.convoys.find((convoy) => convoy.id === id);
}

function findBead(id) {
  return beads.find((bead) => bead.id === id);
}

function findFormula(name) {
  return formulas.find((formula) => formula.name === name);
}

function findCrew(name) {
  return crews.find((crew) => crew.name === name);
}

function broadcast(payload) {
  if (!wss) return;
  const frame = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
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
}

function buildHookResponse() {
  return {
    status: 'active',
    hooks: [
      { name: 'pre-commit', enabled: true },
      { name: 'post-merge', enabled: true },
    ],
  };
}

function requireRig(service, body, res) {
  if ((service === 'witness' || service === 'refinery') && !body?.rig) {
    res.status(400).json({ error: 'rig is required for this service' });
    return null;
  }
  return body?.rig ?? null;
}

export async function startMockServer({ port = 0 } = {}) {
  const app = express();
  app.use(express.json());

  app.use('/assets', express.static(ASSETS_DIR));
  app.use(express.static(WEB_DIST_DIR));

  app.get('/api/status', (_req, res) => res.json(state.status));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/api/convoys', (_req, res) => res.json(state.convoys));
  app.get('/api/convoy/:id', (req, res) => {
    const convoy = findConvoy(req.params.id);
    if (!convoy) {
      res.status(404).json({ error: 'Convoy not found' });
      return;
    }
    res.json(convoy);
  });
  app.post('/api/convoy', (req, res) => {
    const convoy = {
      id: `convoy-${Date.now()}`,
      name: req.body?.name || 'Unnamed Convoy',
      title: req.body?.name || 'Unnamed Convoy',
      status: 'pending',
      priority: 'normal',
      issues: (req.body?.issues || []).map((title) => ({ title })),
      progress: 0,
      created_at: new Date().toISOString(),
      agent_count: 0,
      task_count: Array.isArray(req.body?.issues) ? req.body.issues.length : 0,
      tracked: [],
      completed: 0,
      total: Array.isArray(req.body?.issues) ? req.body.issues.length : 0,
    };
    state.convoys.unshift(convoy);
    recordActivity('convoy_created', { id: convoy.id, name: convoy.name });
    res.status(201).json(convoy);
  });

  app.get('/api/hook', (_req, res) => res.json(buildHookResponse()));
  app.get('/api/mail', (_req, res) => res.json(state.mail));
  app.get('/api/mail/all', (_req, res) => res.json(state.mail));
  app.get('/api/mail/:id', (req, res) => {
    const mail = state.mail.find((item) => item.id === req.params.id);
    if (!mail) {
      res.status(404).json({ error: 'Mail not found' });
      return;
    }
    res.json(mail);
  });
  app.post('/api/mail/:id/read', (req, res) => {
    const mail = state.mail.find((item) => item.id === req.params.id);
    if (!mail) {
      res.status(404).json({ error: 'Mail not found' });
      return;
    }
    mail.read = true;
    res.json({ success: true, mail });
  });
  app.post('/api/mail/:id/unread', (req, res) => {
    const mail = state.mail.find((item) => item.id === req.params.id);
    if (!mail) {
      res.status(404).json({ error: 'Mail not found' });
      return;
    }
    mail.read = false;
    res.json({ success: true, mail });
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

  app.get('/api/agents', (_req, res) => res.json(agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    running: agent.running,
  }))));

  app.get('/api/rigs', (_req, res) => res.json(mockRigs));
  app.post('/api/rigs', (req, res) => {
    if (!req.body?.name || !req.body?.url) {
      res.status(400).json({ error: 'Missing required fields: name, url' });
      return;
    }
    const rig = { name: req.body.name, url: req.body.url, path: `/home/user/gt/${req.body.name}`, status: 'active' };
    mockRigs.push(rig);
    res.status(201).json({ success: true, rig, name: rig.name });
  });
  app.delete('/api/rigs/:name', (req, res) => {
    const index = mockRigs.findIndex((rig) => rig.name === req.params.name);
    if (index === -1) {
      res.status(404).json({ error: 'Rig not found' });
      return;
    }
    mockRigs.splice(index, 1);
    res.json({ success: true, removed: req.params.name });
  });

  app.get('/api/doctor', (_req, res) => {
    res.json({
      status: 'healthy',
      checks: [
        { name: 'git', status: 'ok', message: 'Git 2.43.0 installed' },
        { name: 'beads', status: 'ok', message: 'beads 0.44.0 installed' },
        { name: 'tmux', status: 'ok', message: 'tmux 3.4 installed' },
      ],
      timestamp: new Date().toISOString(),
    });
  });
  app.post('/api/doctor/fix', (_req, res) => {
    res.json({ success: true, fixed: ['tmux session cleanup', 'stale lock removal'], timestamp: new Date().toISOString() });
  });

  app.get('/api/setup/status', (_req, res) => {
    res.json({
      installed: true,
      ready: true,
      workspace: '~/gt',
      gt_installed: true,
      gt_version: '0.1.0',
      bd_installed: true,
      bd_version: '0.44.0',
      workspace_initialized: true,
      workspace_path: '~/gt',
      rigs: mockRigs,
      agents: agents.length,
    });
  });

  app.post('/api/nudge', (req, res) => {
    recordActivity('nudge', { target: req.body?.target ?? null, message: req.body?.message ?? '' });
    res.json({ success: true, target: req.body?.target ?? null, message: req.body?.message ?? '' });
  });

  app.get('/api/beads', (_req, res) => res.json(beads));
  app.post('/api/beads', (req, res) => {
    if (!req.body?.title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    const bead = {
      id: `bead-${Date.now()}`,
      title: req.body.title,
      description: req.body.description ?? '',
      status: 'open',
      priority: req.body.priority ?? 2,
      assignee: null,
      labels: req.body.labels ?? [],
    };
    beads.push(bead);
    res.status(201).json({ success: true, bead_id: bead.id, bead });
  });
  app.get('/api/bead/:id', (req, res) => {
    const bead = findBead(req.params.id);
    if (!bead) {
      res.status(404).json({ error: 'Bead not found' });
      return;
    }
    res.json(bead);
  });
  app.get('/api/bead/:id/links', (req, res) => {
    const bead = findBead(req.params.id);
    if (!bead) {
      res.status(404).json({ error: 'Bead not found' });
      return;
    }
    res.json({ prs: [{ id: 'pr-1', url: 'https://github.com/web3dev1337/gastown-gui/pull/1' }] });
  });
  app.post('/api/work/:id/done', (req, res) => {
    const bead = findBead(req.params.id);
    if (!bead) {
      res.status(404).json({ error: 'Bead not found' });
      return;
    }
    bead.status = 'closed';
    bead.close_reason = req.body?.summary ?? 'completed';
    res.json({ success: true, bead });
  });
  app.post('/api/work/:id/park', (req, res) => {
    const bead = findBead(req.params.id);
    if (!bead) {
      res.status(404).json({ error: 'Bead not found' });
      return;
    }
    bead.status = 'parked';
    bead.park_reason = req.body?.reason ?? 'parked';
    res.json({ success: true, bead });
  });
  app.post('/api/work/:id/release', (req, res) => {
    const bead = findBead(req.params.id);
    if (!bead) {
      res.status(404).json({ error: 'Bead not found' });
      return;
    }
    bead.status = 'open';
    bead.assignee = null;
    res.json({ success: true, bead });
  });
  app.post('/api/work/:id/reassign', (req, res) => {
    const bead = findBead(req.params.id);
    if (!bead) {
      res.status(404).json({ error: 'Bead not found' });
      return;
    }
    bead.assignee = req.body?.target ?? null;
    res.json({ success: true, bead });
  });
  app.get('/api/beads/search', (req, res) => {
    const query = String(req.query.q ?? '').toLowerCase();
    res.json(beads.filter((bead) => bead.id.toLowerCase().includes(query) || bead.title.toLowerCase().includes(query)));
  });

  app.get('/api/formulas', (_req, res) => res.json(formulas));
  app.post('/api/formulas', (req, res) => {
    if (!req.body?.name || !req.body?.template) {
      res.status(400).json({ error: 'name and template are required' });
      return;
    }
    const existing = findFormula(req.body.name);
    if (existing) {
      res.status(409).json({ error: 'Formula already exists' });
      return;
    }
    const formula = {
      name: req.body.name,
      description: req.body.description ?? '',
      template: req.body.template,
    };
    formulas.push(formula);
    res.status(201).json({ success: true, formula });
  });
  app.get('/api/formula/:name', (req, res) => {
    const formula = findFormula(req.params.name);
    if (!formula) {
      res.status(404).json({ error: 'Formula not found' });
      return;
    }
    res.json(formula);
  });
  app.post('/api/formula/:name/use', (req, res) => {
    const formula = findFormula(req.params.name);
    if (!formula) {
      res.status(404).json({ error: 'Formula not found' });
      return;
    }
    if (!req.body?.target) {
      res.status(400).json({ error: 'target is required' });
      return;
    }
    res.json({ success: true, formula: formula.name, target: req.body.target, args: req.body.args ?? {} });
  });
  app.put('/api/formula/:name', (req, res) => {
    const formula = findFormula(req.params.name);
    if (!formula) {
      res.status(404).json({ error: 'Formula not found' });
      return;
    }
    if (!req.body?.template) {
      res.status(400).json({ error: 'template is required' });
      return;
    }
    formula.description = req.body.description ?? formula.description;
    formula.template = req.body.template;
    res.json({ success: true, formula });
  });
  app.delete('/api/formula/:name', (req, res) => {
    const index = formulas.findIndex((formula) => formula.name === req.params.name);
    if (index === -1) {
      res.status(404).json({ error: 'Formula not found' });
      return;
    }
    const [removed] = formulas.splice(index, 1);
    res.json({ success: true, name: removed.name });
  });
  app.get('/api/formulas/search', (req, res) => {
    const query = String(req.query.q ?? '').toLowerCase();
    res.json(formulas.filter((formula) => formula.name.toLowerCase().includes(query) || formula.description.toLowerCase().includes(query)));
  });

  app.get('/api/targets', (_req, res) => res.json(state.targets));
  app.post('/api/sling', (req, res) => {
    recordActivity('sling', { bead: req.body?.bead ?? null, target: req.body?.target ?? null });
    res.json({
      success: true,
      id: `sling-${Date.now()}`,
      bead: req.body?.bead ?? null,
      target: req.body?.target ?? null,
      molecule: req.body?.molecule ?? null,
      quality: req.body?.quality ?? 'normal',
      status: 'dispatched',
      timestamp: new Date().toISOString(),
    });
  });
  app.post('/api/escalate', (req, res) => {
    recordActivity('escalation_sent', { convoy_id: req.body?.convoy_id ?? null, reason: req.body?.reason ?? '' });
    res.json({ success: true, convoy_id: req.body?.convoy_id ?? null, reason: req.body?.reason ?? '', priority: req.body?.priority ?? 'normal' });
  });
  app.get('/api/github/repos', (_req, res) => res.json(githubRepos));

  app.get('/api/activity', (_req, res) => res.json({ items: state.activity, total: state.activity.length }));
  app.get('/api/changelog', (_req, res) => res.json([]));
  app.get('/api/escalations', (_req, res) => res.json(state.escalations));
  app.post('/api/escalations/:id/ack', (req, res) => res.json({ success: true, id: req.params.id }));
  app.post('/api/escalations/:id/close', (req, res) => res.json({ success: true, id: req.params.id }));
  app.get('/api/scheduler/status', (_req, res) => res.json(state.scheduler));
  app.get('/api/dogs', (_req, res) => res.json(state.dogs));

  app.get('/api/polecat/:rig/:name/output', (req, res) => {
    const key = `${req.params.rig}/${req.params.name}`;
    if (!polecats.has(key)) {
      res.status(404).json({ error: 'Polecat not found' });
      return;
    }
    res.json({ output: `[${new Date().toISOString()}] Polecat ${req.params.name} running in ${req.params.rig}`, lines: 1 });
  });
  app.get('/api/polecat/:rig/:name/transcript', (req, res) => {
    const key = `${req.params.rig}/${req.params.name}`;
    if (!polecats.has(key)) {
      res.status(404).json({ error: 'Polecat not found' });
      return;
    }
    res.json({ transcript: 'Session transcript', messages: 2 });
  });
  app.post('/api/polecat/:rig/:name/start', (req, res) => {
    const key = `${req.params.rig}/${req.params.name}`;
    const polecat = { rig: req.params.rig, name: req.params.name, status: 'running', started: new Date().toISOString() };
    polecats.set(key, polecat);
    res.json({ success: true, polecat });
  });
  app.post('/api/polecat/:rig/:name/stop', (req, res) => {
    const key = `${req.params.rig}/${req.params.name}`;
    if (!polecats.has(key)) {
      res.status(404).json({ error: 'Polecat not found' });
      return;
    }
    polecats.delete(key);
    res.json({ success: true, stopped: key });
  });
  app.post('/api/polecat/:rig/:name/restart', (req, res) => {
    const key = `${req.params.rig}/${req.params.name}`;
    const polecat = { rig: req.params.rig, name: req.params.name, status: 'running', restarted: true, started: new Date().toISOString() };
    polecats.set(key, polecat);
    res.json({ success: true, polecat });
  });

  app.get('/api/mayor/output', (_req, res) => res.json({ output: 'Mayor output', lines: 1 }));
  app.get('/api/mayor/messages', (_req, res) => res.json(mayorMessages));

  app.get('/api/service/:name/status', (req, res) => {
    if (req.params.name === 'fake-service') {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    const entry = serviceState.get(req.params.name) ?? { name: req.params.name, status: 'running' };
    res.json(entry);
  });
  app.post('/api/service/:name/:action(up|down|restart)', (req, res) => {
    const { name, action } = req.params;
    if (!['mayor', 'deacon', 'witness', 'refinery'].includes(name)) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    const rig = requireRig(name, req.body, res);
    if ((name === 'witness' || name === 'refinery') && rig == null) return;

    const key = rig ? `${name}:${rig}` : name;
    const current = serviceState.get(key) ?? { name, rig: rig ?? undefined, status: 'stopped' };
    const nextStatus = action === 'down' ? 'stopped' : 'running';
    const service = { ...current, status: nextStatus, rig: rig ?? current.rig };
    serviceState.set(key, service);
    res.json({ success: true, restarted: action === 'restart', service });
  });

  app.get('/api/crews', (_req, res) => res.json(crews));
  app.post('/api/crews', (req, res) => {
    if (!req.body?.name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (findCrew(req.body.name)) {
      res.status(409).json({ error: 'Crew already exists' });
      return;
    }
    const crew = {
      name: req.body.name,
      rig: req.body.rig ?? 'unknown',
      members: [],
      status: 'active',
    };
    crews.push(crew);
    res.status(201).json({ success: true, crew });
  });
  app.get('/api/crew/:name/status', (req, res) => {
    const crew = findCrew(req.params.name);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }
    res.json(crew);
  });
  app.delete('/api/crew/:name', (req, res) => {
    const index = crews.findIndex((crew) => crew.name === req.params.name);
    if (index === -1) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }
    crews.splice(index, 1);
    res.json({ success: true, removed: req.params.name });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
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
