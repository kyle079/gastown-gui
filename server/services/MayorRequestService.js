const PRIORITY_MAP = {
  p0: 'urgent',
  urgent: 'urgent',
  critical: 'critical',
  p1: 'high',
  high: 'high',
  p2: 'normal',
  normal: 'normal',
  p3: 'low',
  low: 'low',
  p4: 'backlog',
  backlog: 'backlog',
};

function truncateAtWord(text, max = 88) {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const safe = slice.includes(' ') ? slice.slice(0, slice.lastIndexOf(' ')) : slice;
  return `${safe.trim()}…`;
}

function detectPriority(text) {
  const match = String(text || '').match(/\b(P[0-4]|urgent|critical|high|normal|low|backlog)\b/i);
  if (!match) return null;
  return PRIORITY_MAP[match[1].toLowerCase()] || null;
}

function cleanRequestText(text) {
  return String(text || '')
    .replace(/\b(?:priority|prio)\s*:\s*(P[0-4]|urgent|critical|high|normal|low|backlog)\b/gi, '')
    .replace(/\b(?:dispatch|sling)\s+to\s+[A-Za-z0-9_/-]+\b/gi, '')
    .replace(/\btarget\s*:\s*[A-Za-z0-9_/-]+\b/gi, '')
    .replace(/\s+->\s*[A-Za-z0-9_/-]+\b/g, '')
    .replace(/@[A-Za-z0-9_/-]+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectTarget(text, fallbackTarget) {
  const source = String(text || '');
  const match = source.match(
    /\b(?:dispatch|sling)\s+to\s+([A-Za-z0-9_/-]+)\b|\btarget\s*:\s*([A-Za-z0-9_/-]+)\b|->\s*([A-Za-z0-9_/-]+)\b|@([A-Za-z0-9_/-]+)\b/i,
  );
  return match ? match.slice(1).find(Boolean) || fallbackTarget || null : fallbackTarget || null;
}

function buildTitle(text) {
  const cleaned = cleanRequestText(text);
  if (!cleaned) return '';

  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  return truncateAtWord(sentence.trim());
}

function splitBulletItems(lines) {
  const items = [];
  let current = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      if (current.length > 0) current.push('');
      continue;
    }

    const bullet = trimmed.match(/^([-*+]\s+|\d+[.)]\s+)(.+)$/);
    if (bullet) {
      if (current.length > 0) items.push(current.join('\n').trim());
      current = [bullet[2]];
      continue;
    }

    if (current.length > 0) {
      current.push(trimmed);
    }
  }

  if (current.length > 0) items.push(current.join('\n').trim());
  return items;
}

function splitParagraphItems(prompt) {
  return String(prompt || '')
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePromptItems(prompt, fallbackTarget) {
  const normalized = String(prompt || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const hasBullets = lines.some((line) => /^(\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(line));
  const rawItems = hasBullets ? splitBulletItems(lines) : splitParagraphItems(normalized);

  return rawItems
    .map((text) => {
      const title = buildTitle(text);
      if (!title) return null;

      return {
        title,
        text: text.trim(),
        target: detectTarget(text, fallbackTarget),
        priority: detectPriority(text),
      };
    })
    .filter(Boolean);
}

function buildDescription({ itemText, prompt, itemCount }) {
  const intro = 'Created from operator Ask Mayor request.';
  if (itemCount <= 1) return `${intro}\n\n${prompt.trim()}`;
  return `${intro}\n\nItem:\n${itemText.trim()}\n\nOriginal request:\n${prompt.trim()}`;
}

function summarizeResults(items) {
  const created = items.filter((item) => item.stage !== 'parse_failed' && item.stage !== 'create_failed').length;
  const dispatched = items.filter((item) => item.stage === 'dispatched').length;
  const failed = items.filter((item) => item.stage === 'create_failed' || item.stage === 'dispatch_failed').length;
  return { created, dispatched, failed };
}

export class MayorRequestService {
  constructor({ beadService, workService } = {}) {
    if (!beadService?.create) throw new Error('MayorRequestService requires beadService.create()');
    if (!workService?.sling) throw new Error('MayorRequestService requires workService.sling()');

    this._beadService = beadService;
    this._workService = workService;
  }

  async submit({ prompt, target, molecule, args } = {}) {
    if (!String(prompt || '').trim()) {
      return { ok: false, statusCode: 400, error: 'Prompt is required', errorType: 'prompt_required' };
    }

    const items = parsePromptItems(prompt, target);
    if (items.length === 0) {
      return {
        ok: false,
        statusCode: 400,
        error: 'Could not find an actionable work item in that request',
        errorType: 'prompt_parse_failed',
      };
    }

    const results = [];
    for (const item of items) {
      const created = await this._beadService.create({
        title: item.title,
        description: buildDescription({ itemText: item.text, prompt, itemCount: items.length }),
        priority: item.priority,
        labels: ['mayor-request', 'operator-request'],
      });

      if (!created.ok || !created.beadId) {
        results.push({
          title: item.title,
          target: item.target,
          stage: 'create_failed',
          error: created.error || 'Bead creation failed',
        });
        continue;
      }

      const sling = await this._workService.sling({
        bead: created.beadId,
        target: item.target || undefined,
        molecule: molecule || undefined,
        args: args || undefined,
      });

      if (!sling.ok) {
        results.push({
          beadId: created.beadId,
          title: item.title,
          target: item.target,
          stage: 'dispatch_failed',
          error: sling.body?.error || 'Dispatch failed',
        });
        continue;
      }

      results.push({
        beadId: created.beadId,
        title: item.title,
        target: item.target,
        stage: 'dispatched',
        dispatch: sling.data,
      });
    }

    const summary = summarizeResults(results);
    const status =
      summary.failed === 0 ? 'ok' : summary.dispatched > 0 || summary.created > 0 ? 'partial' : 'failed';

    return {
      ok: true,
      data: {
        status,
        prompt: String(prompt).trim(),
        target: target || null,
        molecule: molecule || null,
        args: args || null,
        items: results,
        summary,
      },
    };
  }
}
