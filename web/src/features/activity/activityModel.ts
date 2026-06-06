import type { ActivityEvent } from '@/lib/api/types';
import type { Tone } from '@/components/primitives';
import { humanize } from '@/lib/utils/format';

/**
 * Activity events fold into a few operator-meaningful categories. Order here is
 * signal order — escalations first, session churn (the noisy majority) last.
 */
export type ActivityCategory = 'escalation' | 'work' | 'comms' | 'session' | 'system';

export interface CategoryMeta {
  key: ActivityCategory;
  label: string;
  tone: Tone;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'escalation', label: 'Escalations', tone: 'danger' },
  { key: 'work', label: 'Work', tone: 'accent' },
  { key: 'comms', label: 'Comms', tone: 'info' },
  { key: 'session', label: 'Sessions', tone: 'neutral' },
  { key: 'system', label: 'System', tone: 'neutral' },
];

/** A row-ready projection of a raw event. */
export interface ActivityView {
  id: string;
  ts: string | null;
  category: ActivityCategory;
  tone: Tone;
  /** Short verb for the event kind. */
  label: string;
  /** Who acted. */
  actor: string;
  /** The object acted on — bead id, target address, polecat — if any. */
  target?: string;
  /** Free-text detail: reason, subject, branch… */
  detail?: string;
}

type Payload = Record<string, unknown>;

function str(p: Payload, key: string): string | undefined {
  const v = p[key];
  if (typeof v === 'string') return v.trim() || undefined;
  if (typeof v === 'number') return String(v);
  return undefined;
}

interface Descriptor {
  category: ActivityCategory;
  tone: Tone;
  label: string;
  target?: (p: Payload) => string | undefined;
  detail?: (p: Payload) => string | undefined;
}

const DESCRIPTORS: Record<string, Descriptor> = {
  escalation_sent: {
    category: 'escalation',
    tone: 'danger',
    label: 'escalation',
    target: (p) => str(p, 'to'),
    detail: (p) => [str(p, 'severity'), str(p, 'reason')].filter(Boolean).join(' · ') || undefined,
  },
  escalation_acked: {
    category: 'escalation',
    tone: 'warn',
    label: 'esc acked',
    target: (p) => str(p, 'escalation_id'),
    detail: (p) => {
      const by = str(p, 'acked_by');
      return by ? `by ${by}` : undefined;
    },
  },
  escalation_closed: {
    category: 'escalation',
    tone: 'ok',
    label: 'esc closed',
    target: (p) => str(p, 'escalation_id'),
    detail: (p) => str(p, 'reason'),
  },
  sling: {
    category: 'work',
    tone: 'accent',
    label: 'slung',
    target: (p) => str(p, 'bead'),
    detail: (p) => {
      const t = str(p, 'target');
      return t ? `→ ${t}` : undefined;
    },
  },
  done: {
    category: 'work',
    tone: 'ok',
    label: 'done',
    target: (p) => str(p, 'bead'),
    detail: (p) => str(p, 'branch'),
  },
  spawn: {
    category: 'work',
    tone: 'accent',
    label: 'spawn',
    target: (p) => str(p, 'polecat'),
    detail: (p) => {
      const rig = str(p, 'rig');
      return rig ? `rig ${rig}` : undefined;
    },
  },
  handoff: {
    category: 'work',
    tone: 'info',
    label: 'handoff',
    detail: (p) => str(p, 'subject'),
  },
  mail: {
    category: 'comms',
    tone: 'info',
    label: 'mail',
    target: (p) => str(p, 'to'),
    detail: (p) => str(p, 'subject') ?? str(p, 'message'),
  },
  nudge: {
    category: 'comms',
    tone: 'neutral',
    label: 'nudge',
    target: (p) => str(p, 'target'),
    detail: (p) => str(p, 'reason'),
  },
  session_start: {
    category: 'session',
    tone: 'neutral',
    label: 'session start',
    detail: (p) => str(p, 'role'),
  },
  session_death: {
    category: 'session',
    tone: 'neutral',
    label: 'session end',
    detail: (p) => str(p, 'reason'),
  },
};

/** Project a raw event into a display-ready view. Pure — easy to test. */
export function toActivityView(event: ActivityEvent): ActivityView {
  const payload = event.payload ?? {};
  const d = DESCRIPTORS[event.type];

  if (!d) {
    return {
      id: event.id,
      ts: event.ts,
      category: 'system',
      tone: 'neutral',
      label: humanize(event.type).toLowerCase(),
      actor: event.actor ?? 'system',
    };
  }

  return {
    id: event.id,
    ts: event.ts,
    category: d.category,
    tone: d.tone,
    label: d.label,
    actor: event.actor ?? 'system',
    target: d.target?.(payload),
    detail: d.detail?.(payload),
  };
}

/** Case-insensitive substring match across the visible text of a row. */
export function matchesQuery(view: ActivityView, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [view.actor, view.label, view.target, view.detail]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q));
}
