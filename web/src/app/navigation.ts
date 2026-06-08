/**
 * Single source of truth for primary navigation.
 * Consumed by the router skeleton, the sidebar, and the command palette so a
 * new surface is wired everywhere by adding one entry.
 */
export interface NavItem {
  path: string;
  label: string;
  /** Secondary plain-language description answering "why would I come here?" */
  objectLabel: string;
  /** Mono glyph — a single technical character, never an icon-font. */
  glyph: string;
  /** Intent-focused grouping in the rail/palette docs. */
  section: 'Surfaces' | 'Reference';
  /** Sequence hint shown in the palette (chord after `g`). */
  seq: string;
  /** False until the surface is built. */
  ready: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Overview', objectLabel: 'System health and top signals', glyph: '◇', section: 'Surfaces', seq: 'o', ready: true },
  { path: '/attention', label: 'Needs Attention', objectLabel: 'Mail, escalations, blocked work', glyph: '✉', section: 'Surfaces', seq: 'n', ready: true },
  { path: '/dispatch', label: 'Dispatch', objectLabel: 'Targets and workflow templates', glyph: '⌘', section: 'Surfaces', seq: 'd', ready: true },
  { path: '/fleet', label: 'Fleet', objectLabel: 'Rigs and agents', glyph: '▤', section: 'Surfaces', seq: 'f', ready: true },
  { path: '/landing', label: 'Landing', objectLabel: 'Pull requests and merge queue', glyph: '⌥', section: 'Surfaces', seq: 'l', ready: true },
  { path: '/investigate', label: 'Investigate', objectLabel: 'Timeline, issues, formulas, graph', glyph: '⬡', section: 'Surfaces', seq: 'i', ready: true },
  { path: '/help', label: 'Help', objectLabel: 'Documentation and getting started', glyph: '?', section: 'Reference', seq: 'h', ready: true },
];
