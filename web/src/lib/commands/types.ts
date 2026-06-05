import type { ReactNode } from 'react';

export interface Command {
  id: string;
  title: string;
  /** Grouping header in the palette, e.g. "Navigation", "Actions". */
  group: string;
  /** Extra terms to match against in search. */
  keywords?: string[];
  /** Display-only shortcut hint, e.g. "g d". */
  shortcut?: string;
  /** Optional leading glyph (text/mono char — no icon fonts). */
  glyph?: ReactNode;
  run: () => void;
}
