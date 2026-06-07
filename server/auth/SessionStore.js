import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'gt_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class SessionStore {
  constructor({ secret }) {
    if (!secret || secret.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters');
    }
    this._secret = secret;
    this._sessions = new Map();
    // Prune expired sessions every hour
    setInterval(() => this._prune(), 60 * 60 * 1000).unref();
  }

  create(data) {
    const id = randomBytes(32).toString('hex');
    this._sessions.set(id, { ...data, _createdAt: Date.now() });
    return id;
  }

  get(id) {
    if (!id) return null;
    const session = this._sessions.get(id);
    if (!session) return null;
    if (Date.now() - session._createdAt > SESSION_TTL_MS) {
      this._sessions.delete(id);
      return null;
    }
    return session;
  }

  delete(id) {
    this._sessions.delete(id);
  }

  _sign(id) {
    return createHmac('sha256', this._secret).update(id).digest('hex');
  }

  _verify(id, sig) {
    const expected = Buffer.from(this._sign(id), 'hex');
    const actual = Buffer.from(sig, 'hex');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }

  cookieValue(id) {
    return `${id}.${this._sign(id)}`;
  }

  parseAndVerify(cookieValue) {
    if (!cookieValue) return null;
    const dot = cookieValue.lastIndexOf('.');
    if (dot === -1) return null;
    const id = cookieValue.slice(0, dot);
    const sig = cookieValue.slice(dot + 1);
    if (!id || !sig) return null;
    try {
      if (!this._verify(id, sig)) return null;
    } catch {
      return null;
    }
    return id;
  }

  setCookie(res, id, { secure = false } = {}) {
    const value = this.cookieValue(id);
    const attrs = [
      `${COOKIE_NAME}=${value}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
      `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    ];
    if (secure) attrs.push('Secure');
    res.setHeader('Set-Cookie', attrs.join('; '));
  }

  clearCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  }

  readFromRequest(req) {
    const cookieHeader = req.headers.cookie || '';
    let raw = null;
    for (const part of cookieHeader.split(';')) {
      const trimmed = part.trim();
      if (trimmed.startsWith(COOKIE_NAME + '=')) {
        raw = trimmed.slice(COOKIE_NAME.length + 1);
        break;
      }
    }
    if (!raw) return null;
    const id = this.parseAndVerify(raw);
    return id ? { id, data: this.get(id) } : null;
  }

  _prune() {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, session] of this._sessions) {
      if (session._createdAt < cutoff) this._sessions.delete(id);
    }
  }
}
