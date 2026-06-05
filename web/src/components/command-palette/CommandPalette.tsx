import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { Kbd } from '@/components/primitives';
import type { Command } from '@/lib/commands/types';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

/** Loose subsequence match — cheap fuzzy filter, good enough for a command list. */
function matches(command: Command, query: string): boolean {
  if (!query) return true;
  const haystack = `${command.title} ${command.group} ${command.keywords?.join(' ') ?? ''}`.toLowerCase();
  const q = query.toLowerCase();
  let i = 0;
  for (const ch of haystack) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

/**
 * The command palette — the spine of the keyboard-first tool.
 * Type to filter, ↑/↓ to move, Enter to run, Esc to close.
 */
export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => commands.filter((c) => matches(c, query)),
    [commands, query],
  );

  // Reset on open; focus the field.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Defer so the portal node exists.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the active item in view.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    onClose();
    cmd.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(filtered[active]);
    }
  };

  // Group while preserving order of first appearance.
  const groups: { group: string; items: { cmd: Command; index: number }[] }[] = [];
  filtered.forEach((cmd, index) => {
    let g = groups.find((x) => x.group === cmd.group);
    if (!g) {
      g = { group: cmd.group, items: [] };
      groups.push(g);
    }
    g.items.push({ cmd, index });
  });

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[14vh]">
      <div className="fixed inset-0 animate-fade-in bg-ink/70 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-md border border-line-strong bg-overlay shadow-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <span className="font-mono text-xs text-faint">›</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            className="h-11 w-full bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
            spellCheck={false}
            autoComplete="off"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-faint">No matching commands</div>
          ) : (
            groups.map((g) => (
              <div key={g.group} className="px-1.5 pb-1">
                <div className="px-2.5 py-1 text-2xs font-medium uppercase tracking-wider text-faint">
                  {g.group}
                </div>
                {g.items.map(({ cmd, index }) => (
                  <button
                    key={cmd.id}
                    data-index={index}
                    type="button"
                    onMouseMove={() => setActive(index)}
                    onClick={() => run(cmd)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm',
                      index === active ? 'bg-raised text-fg' : 'text-muted',
                    )}
                  >
                    {cmd.glyph != null && (
                      <span className="w-4 text-center font-mono text-xs text-faint">{cmd.glyph}</span>
                    )}
                    <span className="flex-1 truncate">{cmd.title}</span>
                    {cmd.shortcut && (
                      <span className="flex gap-1">
                        {cmd.shortcut.split(' ').map((k, i) => (
                          <Kbd key={i}>{k}</Kbd>
                        ))}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
