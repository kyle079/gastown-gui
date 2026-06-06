import type { BeadGraphNode } from '@/lib/api/types';

/** Deterministic rig-based color palette (Tronvercel hues). */
const RIG_PALETTE = [
  '52 192 212',   // cyan  — c-accent
  '63 185 80',    // green — c-ok
  '88 166 255',   // blue  — c-info
  '210 153 34',   // amber — c-warn
  '248 81 73',    // red   — c-danger
  '150 100 220',  // violet
  '255 140 100',  // orange
];

function hashRig(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function rigColor(rig: string): string {
  return `rgb(${RIG_PALETTE[hashRig(rig) % RIG_PALETTE.length]} / 0.75)`;
}

/** Node colors by status — flat, no glow. */
export const STATUS_COLOR: Record<string, string> = {
  open: 'rgb(var(--c-info))',
  in_progress: 'rgb(var(--c-accent))',
  hooked: 'rgb(var(--c-accent))',
  pinned: 'rgb(var(--c-accent))',
  blocked: 'rgb(var(--c-warn))',
  closed: 'rgb(var(--c-ok))',
  deferred: 'rgb(var(--c-faint))',
};

export function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? 'rgb(var(--c-faint))';
}

/** Border intensity scales with priority urgency. */
export function priorityBorder(priority: number | undefined): string {
  switch (priority) {
    case 0:
      return 'rgb(var(--c-danger))';
    case 1:
      return 'rgb(var(--c-warn))';
    default:
      return 'rgb(var(--c-line-strong))';
  }
}

/** Extract the rig prefix from a bead id (e.g. "gg" from "gg-dny"). */
export function rigPrefix(id: string): string {
  return id.split('-')[0] ?? id;
}

/** Trim title to fit the node label area. */
export function shortTitle(node: BeadGraphNode): string {
  const t = node.title;
  return t.length > 48 ? `${t.slice(0, 46)}…` : t;
}

/** Edge stroke color by dependency type. */
export const EDGE_COLOR: Record<string, string> = {
  blocks: 'rgb(var(--c-warn))',
  'parent-child': 'rgb(var(--c-accent-dim))',
  'discovered-from': 'rgb(var(--c-faint))',
};

export function edgeColor(type: string): string {
  return EDGE_COLOR[type] ?? 'rgb(var(--c-line-strong))';
}
