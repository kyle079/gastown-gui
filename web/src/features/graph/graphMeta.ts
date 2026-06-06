import type { Tone } from '@/components/primitives';

export type EdgeType = 'blocks' | 'discovered-from' | 'parent' | 'child' | 'related' | string;

/** Status → accent color (CSS hex, used for node stroke/fill). */
export const STATUS_COLORS: Record<string, string> = {
  open: '#58a6ff',       // info blue
  in_progress: '#34c0d4', // accent cyan
  hooked: '#34c0d4',     // accent cyan
  pinned: '#34c0d4',     // accent cyan
  blocked: '#d29922',    // warn amber
  closed: '#3fb950',     // ok green
  deferred: '#5c676c',   // faint
};

/** Priority → border width (px) — lower number = more urgent = thicker ring. */
export const PRIORITY_WIDTH: Record<number, number> = {
  0: 3,
  1: 2.5,
  2: 2,
  3: 1.5,
};

export function nodeColor(status: string): string {
  return STATUS_COLORS[status] ?? '#5c676c';
}

export function nodeBorderWidth(priority: number | null): number {
  if (priority == null) return 1.5;
  return PRIORITY_WIDTH[priority] ?? 1.5;
}

/** Edge type → display label + stroke style. */
export interface EdgeMeta {
  label: string;
  tone: Tone;
  dash?: string;
}

export const EDGE_META: Record<string, EdgeMeta> = {
  blocks: { label: 'blocks', tone: 'warn' },
  'blocked-by': { label: 'blocked by', tone: 'warn', dash: '5,3' },
  'discovered-from': { label: 'from', tone: 'neutral', dash: '3,3' },
  parent: { label: 'parent', tone: 'info' },
  child: { label: 'child', tone: 'info', dash: '4,2' },
  related: { label: 'related', tone: 'neutral', dash: '3,3' },
};

export function edgeMeta(type: string): EdgeMeta {
  return EDGE_META[type] ?? { label: type, tone: 'neutral', dash: '3,3' };
}

/** Known rig prefixes and display names. */
export const RIG_LABELS: Record<string, string> = {
  hq: 'HQ',
  lo: 'longeye',
  gg: 'gastown',
  ep: 'epoch',
  low: 'low-orbit',
  rh: 'redhill',
  rs: 'rust',
  hl: 'hal',
};

export function rigLabel(rig: string | null): string {
  if (!rig) return '—';
  return RIG_LABELS[rig] ?? rig;
}
