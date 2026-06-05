import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CommandPalette } from './CommandPalette';
import { useHotkeys, useKeySequence } from '@/lib/keyboard/useHotkeys';
import { useToast } from '@/components/primitives';
import { NAV_ITEMS } from '@/app/navigation';
import type { Command } from '@/lib/commands/types';

interface PaletteContextValue {
  open: () => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

/**
 * Owns the command palette, the global `mod+k` binding, and the `g _` navigation
 * sequences. This is the app's keyboard layer entry point.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = NAV_ITEMS.map((item) => ({
      id: `nav:${item.path}`,
      title: `Go to ${item.label}`,
      group: 'Navigation',
      glyph: item.glyph,
      shortcut: `g ${item.seq}`,
      keywords: [item.label, 'goto', 'open'],
      run: () => void navigate({ to: item.path }),
    }));

    const actions: Command[] = [
      {
        id: 'action:refresh',
        title: 'Refresh all data',
        group: 'Actions',
        glyph: '↻',
        keywords: ['reload', 'refetch', 'sync'],
        run: () => {
          void queryClient.invalidateQueries();
          notify('Refreshing…', 'accent');
        },
      },
    ];

    return [...nav, ...actions];
  }, [navigate, queryClient, notify]);

  // Global open: Cmd/Ctrl+K.
  useHotkeys(
    useMemo(
      () => ({
        'mod+k': () => setIsOpen((v) => !v),
      }),
      [],
    ),
  );

  // `g` then a surface key — classic keyboard-first navigation.
  useKeySequence(
    'g',
    useMemo(() => {
      const map: Record<string, () => void> = {};
      for (const item of NAV_ITEMS) {
        map[item.seq] = () => void navigate({ to: item.path });
      }
      return map;
    }, [navigate]),
  );

  const value = useMemo(() => ({ open }), [open]);

  return (
    <PaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={isOpen} onClose={close} commands={commands} />
    </PaletteContext.Provider>
  );
}

export function useCommandPalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used within <CommandPaletteProvider>');
  return ctx;
}
