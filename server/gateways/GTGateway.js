function parseJsonOrNull(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export class GTGateway {
  constructor({ runner, gtRoot, executable = 'gt' }) {
    if (!runner?.exec) throw new Error('GTGateway requires a runner with exec()');
    if (!gtRoot) throw new Error('GTGateway requires gtRoot');
    this._runner = runner;
    this._gtRoot = gtRoot;
    this._executable = executable;
  }

  async exec(args, options = {}) {
    return this._runner.exec(this._executable, args, { cwd: this._gtRoot, ...options });
  }

  async status({ fast = true, allowExitCodes } = {}) {
    const args = ['status', '--json'];
    if (fast) args.push('--fast');
    const result = await this.exec(args, { timeoutMs: 30000, allowExitCodes });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async listConvoys({ all = false, status } = {}) {
    const args = ['convoy', 'list', '--json'];
    if (all) args.push('--all');
    if (status) args.push(`--status=${status}`);
    const result = await this.exec(args, { timeoutMs: 30000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async convoyStatus(convoyId) {
    const result = await this.exec(['convoy', 'status', convoyId, '--json'], { timeoutMs: 30000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async createConvoy({ name, issues = [], notify } = {}) {
    const args = ['convoy', 'create', name, ...(issues || [])];
    if (notify) args.push('--notify', notify);

    const result = await this.exec(args, { timeoutMs: 30000 });
    const raw = (result.stdout || '').trim();

    const match = raw.match(/(?:Created|created)\s*(?:convoy)?:?\s*(\S+)/i);
    const convoyId = match ? match[1] : null;

    return { ...result, raw, convoyId };
  }

  async sling({ bead, target, molecule, quality, args: slingArgs } = {}) {
    const cmdArgs = ['sling', bead];
    if (target) cmdArgs.push(target);
    if (molecule) cmdArgs.push('--molecule', molecule);
    if (quality) cmdArgs.push(`--quality=${quality}`);
    if (slingArgs) cmdArgs.push('--args', slingArgs);

    const result = await this.exec(cmdArgs, { timeoutMs: 90000 });
    const raw = `${result.stdout || ''}${result.stderr || ''}`.trim();
    return { ...result, raw };
  }

  async escalate({ topic, severity, message } = {}) {
    if (!topic) throw new Error('GTGateway.escalate requires topic');
    if (!message) throw new Error('GTGateway.escalate requires message');

    const args = ['escalate', topic, '-s', severity || 'MEDIUM', '-r', message];
    const result = await this.exec(args, { timeoutMs: 30000 });
    const raw = `${result.stdout || ''}${result.stderr || ''}`.trim();
    return { ...result, raw };
  }

  async schedulerStatus() {
    const result = await this.exec(['scheduler', 'status', '--json'], { timeoutMs: 15000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async dogList() {
    const result = await this.exec(['dog', 'list', '--json'], { timeoutMs: 15000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async dogStatus() {
    const result = await this.exec(['dog', 'status', '--json'], { timeoutMs: 15000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async escalationList() {
    const result = await this.exec(['escalate', 'list', '--json'], { timeoutMs: 15000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async escalationAck(id) {
    if (!id) throw new Error('GTGateway.escalationAck requires id');
    const result = await this.exec(['escalate', 'ack', id], { timeoutMs: 15000 });
    const raw = `${result.stdout || ''}${result.stderr || ''}`.trim();
    return { ...result, raw };
  }

  async escalationClose(id, reason) {
    if (!id) throw new Error('GTGateway.escalationClose requires id');
    const args = ['escalate', 'close', id];
    if (reason) args.push('--reason', reason);
    const result = await this.exec(args, { timeoutMs: 15000 });
    const raw = `${result.stdout || ''}${result.stderr || ''}`.trim();
    return { ...result, raw };
  }

  async mqList(rig) {
    if (!rig) throw new Error('GTGateway.mqList requires rig');
    const result = await this.exec(['mq', 'list', rig, '--json'], { timeoutMs: 15000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async refineryStatus(rig) {
    const args = ['refinery', 'status', '--json'];
    if (rig) args.splice(2, 0, rig);
    const result = await this.exec(args, { timeoutMs: 15000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async witnessStatus(rig) {
    if (!rig) throw new Error('GTGateway.witnessStatus requires rig');
    const result = await this.exec(['witness', 'status', rig, '--json'], { timeoutMs: 15000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async doltHealth() {
    const result = await this.exec(['health', '--json'], { timeoutMs: 15000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async changelog({ since, week, today, rig } = {}) {
    const args = ['changelog', '--json'];
    if (rig) args.push('--rig', rig);
    if (today) args.push('--today');
    else if (week) args.push('--week');
    else if (since) args.push('--since', since);
    const result = await this.exec(args, { timeoutMs: 30000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async rigList() {
    const result = await this.exec(['rig', 'list', '--json'], { timeoutMs: 15000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async trail({ subcommand = 'beads', since, limit } = {}) {
    const args = ['trail', subcommand, '--json'];
    if (since) args.push('--since', since);
    if (limit != null) args.push('--limit', String(limit));
    const result = await this.exec(args, { timeoutMs: 20000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }

  async ready({ rig } = {}) {
    const args = ['ready', '--json'];
    if (rig) args.push('--rig', rig);
    const result = await this.exec(args, { timeoutMs: 20000 });
    const raw = (result.stdout || '').trim();
    return { ...result, raw, data: parseJsonOrNull(raw) };
  }
}
