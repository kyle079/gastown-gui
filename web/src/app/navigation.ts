/**
 * Single source of truth for primary navigation.
 * Consumed by the router skeleton, the sidebar, and the command palette so a
 * new surface is wired everywhere by adding one entry.
 */
export interface NavItem {
  path: string;
  label: string;
  /** Secondary object-type noun so the operator still knows what's underneath. */
  objectLabel: string;
  /** Mono glyph — a single technical character, never an icon-font. */
  glyph: string;
  /** Intent-focused grouping in the rail/palette docs. */
  section: 'Run' | 'Coordinate' | 'Inspect' | 'Reference';
  /** Sequence hint shown in the palette (chord after `g`). */
  seq: string;
  /** False until the surface is built. */
  ready: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Monitor', objectLabel: 'Dashboard', glyph: '◇', section: 'Run', seq: 'd', ready: true },
  { path: '/activity', label: 'Watch', objectLabel: 'Activity feed', glyph: '≋', section: 'Run', seq: 'a', ready: true },
  { path: '/mail', label: 'Unblock', objectLabel: 'Mail and escalations queue', glyph: '✉', section: 'Run', seq: 'm', ready: true },
  { path: '/rigs', label: 'Direct', objectLabel: 'Rigs and agents', glyph: '▤', section: 'Coordinate', seq: 'r', ready: true },
  { path: '/work', label: 'Track', objectLabel: 'Convoys and work', glyph: '◷', section: 'Coordinate', seq: 'w', ready: true },
  { path: '/ops', label: 'Operate', objectLabel: 'Operator console', glyph: '⚙', section: 'Coordinate', seq: 'o', ready: true },
  { path: '/prs', label: 'Review', objectLabel: 'Pull requests', glyph: '⌥', section: 'Inspect', seq: 'p', ready: true },
  { path: '/issues', label: 'Browse', objectLabel: 'Issues', glyph: '⊟', section: 'Inspect', seq: 'i', ready: true },
  { path: '/formulas', label: 'Browse', objectLabel: 'Formulas', glyph: 'ƒ', section: 'Inspect', seq: 'f', ready: true },
  { path: '/graph', label: 'Trace', objectLabel: 'Dependency graph', glyph: '⬡', section: 'Inspect', seq: 'g', ready: true },
  { path: '/terminal', label: 'Command', objectLabel: 'Terminal', glyph: '⌗', section: 'Reference', seq: 't', ready: true },
  { path: '/help', label: 'Learn', objectLabel: 'Help', glyph: '?', section: 'Reference', seq: 'h', ready: true },
];
