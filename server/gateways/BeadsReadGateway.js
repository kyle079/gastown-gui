import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeDate(value) {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value.includes('T') ? value : `${value}Z`;
  return String(value);
}

function normalizeInteger(value) {
  if (value == null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeBeadRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: normalizeInteger(row.priority),
    issue_type: row.issue_type || 'task',
    owner: row.owner || '',
    assignee: row.assignee || null,
    labels: normalizeJsonArray(row.labels_json),
    created_at: normalizeDate(row.created_at),
    created_by: row.created_by || '',
    updated_at: normalizeDate(row.updated_at),
    dependency_count: normalizeInteger(row.dependency_count) ?? 0,
    dependent_count: normalizeInteger(row.dependent_count) ?? 0,
    comment_count: normalizeInteger(row.comment_count) ?? 0,
  };
}

async function resolveMetadataPath(beadsDir) {
  const redirectPath = path.join(beadsDir, 'redirect');
  try {
    const redirect = (await fs.readFile(redirectPath, 'utf8')).trim();
    if (redirect) {
      return path.join(path.resolve(path.dirname(beadsDir), redirect), 'metadata.json');
    }
  } catch {
    // Fall through to local metadata file.
  }
  return path.join(beadsDir, 'metadata.json');
}

async function loadConnectionConfig({ beadsDir, metadataPath, metadata }) {
  if (metadata) return metadata;

  const resolvedMetadataPath = metadataPath ?? await resolveMetadataPath(beadsDir);
  const content = await fs.readFile(resolvedMetadataPath, 'utf8');
  return JSON.parse(content);
}

function listQuery({ includeFilter = false } = {}) {
  return `
    SELECT
      i.id,
      i.title,
      i.description,
      i.status,
      CAST(i.priority AS SIGNED) AS priority,
      i.issue_type,
      i.owner,
      i.assignee,
      i.created_at,
      i.created_by,
      i.updated_at,
      COALESCE(labels.labels_json, JSON_ARRAY()) AS labels_json,
      COALESCE(dep_counts.dependency_count, 0) AS dependency_count,
      COALESCE(depender_counts.dependent_count, 0) AS dependent_count,
      COALESCE(comment_counts.comment_count, 0) AS comment_count
    FROM issues i
    LEFT JOIN (
      SELECT issue_id, JSON_ARRAYAGG(label) AS labels_json
      FROM labels
      GROUP BY issue_id
    ) labels ON labels.issue_id = i.id
    LEFT JOIN (
      SELECT issue_id, COUNT(*) AS dependency_count
      FROM dependencies
      GROUP BY issue_id
    ) dep_counts ON dep_counts.issue_id = i.id
    LEFT JOIN (
      SELECT depends_on_id AS issue_id, COUNT(*) AS dependent_count
      FROM dependencies
      GROUP BY depends_on_id
    ) depender_counts ON depender_counts.issue_id = i.id
    LEFT JOIN (
      SELECT issue_id, COUNT(*) AS comment_count
      FROM comments
      GROUP BY issue_id
    ) comment_counts ON comment_counts.issue_id = i.id
    ${includeFilter ? 'WHERE __FILTER__' : ''}
    ORDER BY
      CASE i.status
        WHEN 'hooked' THEN 0
        WHEN 'in_progress' THEN 1
        WHEN 'open' THEN 2
        WHEN 'blocked' THEN 3
        WHEN 'deferred' THEN 4
        WHEN 'closed' THEN 5
        ELSE 6
      END,
      CAST(i.priority AS SIGNED) ASC,
      i.updated_at DESC
  `;
}

export class BeadsReadGateway {
  constructor({
    beadsDir,
    metadataPath,
    metadata,
    client = null,
    poolOptions = {},
  } = {}) {
    if (!beadsDir && !metadataPath && !metadata && !client) {
      throw new Error('BeadsReadGateway requires beadsDir, metadataPath, metadata, or client');
    }

    this._beadsDir = beadsDir;
    this._metadataPath = metadataPath ?? null;
    this._metadata = metadata ?? null;
    this._client = client;
    this._poolOptions = poolOptions;
    this._poolPromise = null;
  }

  async _getClient() {
    if (this._client) return this._client;
    if (!this._poolPromise) {
      this._poolPromise = loadConnectionConfig({
        beadsDir: this._beadsDir,
        metadataPath: this._metadataPath,
        metadata: this._metadata,
      }).then((config) => mysql.createPool({
        host: config.dolt_server_host || '127.0.0.1',
        port: config.dolt_server_port || 3307,
        user: config.dolt_server_user || 'root',
        password: config.dolt_server_password || '',
        database: config.dolt_database,
        ssl: false,
        waitForConnections: true,
        connectionLimit: 4,
        queueLimit: 0,
        namedPlaceholders: false,
        ...this._poolOptions,
      }));
    }
    this._client = await this._poolPromise;
    return this._client;
  }

  async _query(sql, params = []) {
    const client = await this._getClient();
    const [rows] = await client.query(sql, params);
    return Array.isArray(rows) ? rows : [];
  }

  async list({ status } = {}) {
    const sql = listQuery({ includeFilter: Boolean(status) }).replace(
      '__FILTER__',
      status ? 'i.status = ?' : '1 = 1',
    );
    const rows = await this._query(sql, status ? [status] : []);
    return rows.map(normalizeBeadRow);
  }

  async search(query = '') {
    const trimmed = String(query || '').trim();
    if (!trimmed) {
      return this.list();
    }

    const like = `%${trimmed}%`;
    const sql = listQuery({ includeFilter: true }).replace(
      '__FILTER__',
      `(
        i.id LIKE ?
        OR i.title LIKE ?
        OR i.description LIKE ?
        OR i.notes LIKE ?
        OR i.design LIKE ?
        OR EXISTS (
          SELECT 1
          FROM labels l
          WHERE l.issue_id = i.id AND l.label LIKE ?
        )
      )`,
    );
    const rows = await this._query(sql, [like, like, like, like, like, like]);
    return rows.map(normalizeBeadRow);
  }

  async get(beadId) {
    const sql = listQuery({ includeFilter: true }).replace('__FILTER__', 'i.id = ?');
    const rows = await this._query(sql, [beadId]);
    const bead = rows[0];
    if (!bead) return null;

    const dependencies = await this._query(`
      SELECT
        d.depends_on_id AS id,
        i.title,
        i.description,
        i.status,
        CAST(i.priority AS SIGNED) AS priority,
        i.issue_type,
        i.created_at,
        i.updated_at,
        CAST(i.ephemeral AS SIGNED) AS ephemeral,
        d.type AS dependency_type
      FROM dependencies d
      JOIN issues i ON i.id = d.depends_on_id
      WHERE d.issue_id = ?
      ORDER BY CAST(i.priority AS SIGNED) ASC, i.updated_at DESC
    `, [beadId]);

    return {
      ...normalizeBeadRow(bead),
      dependencies: dependencies.map((dependency) => ({
        id: dependency.id,
        title: dependency.title,
        description: dependency.description || '',
        status: dependency.status || undefined,
        priority: normalizeInteger(dependency.priority),
        issue_type: dependency.issue_type || 'task',
        created_at: normalizeDate(dependency.created_at),
        updated_at: normalizeDate(dependency.updated_at),
        ephemeral: Boolean(normalizeInteger(dependency.ephemeral)),
        dependency_type: dependency.dependency_type || 'blocks',
      })),
    };
  }

  async graph() {
    const [nodes, edges] = await Promise.all([
      this._query(`
        SELECT id, title, status, CAST(priority AS SIGNED) AS priority, issue_type
        FROM issues
        ORDER BY updated_at DESC
      `),
      this._query(`
        SELECT
          issue_id AS target,
          depends_on_id AS source,
          type
        FROM dependencies
      `),
    ]);

    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        title: node.title,
        status: node.status,
        priority: normalizeInteger(node.priority),
        issue_type: node.issue_type || 'task',
        rig: String(node.id || '').split('-')[0],
      })),
      edges: edges.map((edge) => ({
        id: `${edge.source}→${edge.target}:${edge.type || 'blocks'}`,
        source: edge.source,
        target: edge.target,
        type: edge.type || 'blocks',
      })),
    };
  }
}
