/**
 * Single source of truth for primary navigation.
 * Consumed by the router skeleton, the sidebar, and the command palette so a
 * new surface is wired everywhere by adding one entry.
 *
 * Phase 0 ships Dashboard as the reference surface; the rest are route stubs
 * that Phase 1 fills in.
 */
export interface NavItem {
  path: string;
  label: string;
  /** Mono glyph — a single technical character, never an icon-font. */
  glyph: string;
  /** Sequence hint shown in the palette (chord after `g`). */
  seq: string;
  /** False until the surface is built. */
  ready: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', glyph: '◇', seq: 'd', ready: true },
  { path: '/activity', label: 'Activity', glyph: '≋', seq: 'a', ready: true },
  { path: '/rigs', label: 'Rigs', glyph: '▤', seq: 'r', ready: true },
  { path: '/work', label: 'Work', glyph: '◷', seq: 'w', ready: true },
  { path: '/catalog', label: 'Catalog', glyph: '⊟', seq: 'c', ready: true },
  { path: '/prs', label: 'Pull requests', glyph: '⌥', seq: 'p', ready: true },
  { path: '/mail', label: 'Mail', glyph: '✉', seq: 'm', ready: true },
  { path: '/escalations', label: 'Escalations', glyph: '!', seq: 'e', ready: true },
  { path: '/terminal', label: 'Terminal', glyph: '⌗', seq: 't', ready: true },
  { path: '/help', label: 'Help', glyph: '?', seq: 'h', ready: true },
];
