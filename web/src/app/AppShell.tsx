import { useEffect, useState, type ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils/cn';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * The frame every surface renders inside: rail + top bar + scrolling content.
 *
 * Responsive nav: a persistent rail at `lg+`, an off-canvas drawer below `lg`
 * (toggled from the top bar). `100dvh` keeps the layout honest under mobile
 * browser chrome; the body never scrolls horizontally — only `main` scrolls.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const { location } = useRouterState();

  // Close the drawer whenever the destination changes.
  useEffect(() => setNavOpen(false), [location.pathname]);

  // While the drawer is open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-base text-fg">
      {/* Persistent rail — desktop only. */}
      <Sidebar className="hidden lg:flex" />

      {/* Off-canvas drawer — below lg. Always mounted so it can slide. */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          navOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!navOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-ink/70 backdrop-blur-[1px] transition-opacity duration-200',
            navOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setNavOpen(false)}
        />
        <Sidebar
          className={cn(
            'absolute inset-y-0 left-0 shadow-overlay transition-transform duration-200 ease-out',
            navOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          onNavigate={() => setNavOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
