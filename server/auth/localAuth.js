/**
 * Vendored from @tronvercel/auth (local-password mode).
 * Ported from TypeScript to plain ES modules.
 * Source: tronvercel_ui/refinery/rig/packages/auth/src/{password,store,local}.ts
 */

import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export function isHash(s) {
  return /^\$2[ab]\$\d+\$/.test(s);
}

export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, ROUNDS);
}

export async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

/**
 * In-memory user store. Holds one or more users seeded at startup.
 */
export class MemoryStore {
  constructor() {
    this._users = new Map();
    this._byUsername = new Map();
    this._nextId = 1;
  }

  async findByUsername(username) {
    const id = this._byUsername.get(username.toLowerCase());
    return id != null ? (this._users.get(id) ?? null) : null;
  }

  async findById(id) {
    return this._users.get(id) ?? null;
  }

  async create({ username, passwordHash, roles = [] }) {
    if (this._byUsername.has(username.toLowerCase())) {
      throw new Error(`User '${username}' already exists`);
    }
    const id = String(this._nextId++);
    const stored = { id, username, passwordHash, roles };
    this._users.set(id, stored);
    this._byUsername.set(username.toLowerCase(), id);
    return stored;
  }

  async list() {
    return Array.from(this._users.values());
  }
}

/**
 * Build an in-memory store and seed the admin user from env.
 * adminUser and adminPass are read from the resolved config.
 *
 * @param {{ adminUser?: string, adminPass?: string }} opts
 * @returns {Promise<MemoryStore>}
 */
export async function buildLocalStore({ adminUser, adminPass } = {}) {
  const store = new MemoryStore();
  if (adminUser && adminPass) {
    const hash = isHash(adminPass) ? adminPass : await hashPassword(adminPass);
    await store.create({ username: adminUser, passwordHash: hash, roles: ['admin'] });
  }
  return store;
}
