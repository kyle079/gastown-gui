import { useRouterState } from '@tanstack/react-router';
import { Button, Kbd, Spinner } from '@/components/primitives';
import { useCommandPalette } from '@/components/command-palette/CommandPaletteProvider';
import { useStatus } from '@/lib/query/hooks';
import { NAV_ITEMS } from './navigation';

/** Top bar: current surface title, live status, command-palette launcher. */
export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { open } = useCommandPalette();
  const { location } = useRouterState();
  const { data, isFetching } = useStatus();

  const current =
    NAV_ITEMS.find((n) =>
      n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path),
    ) ?? null;

  return (
    <header
      className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-base px-4"
      style={{ height: 'var(--topbar-h)' }}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Drawer toggle — only when the rail is collapsed (below lg). */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded font-mono text-base text-muted transition-colors hover:bg-raised hover:text-fg focus-visible:ring-1 focus-visible:ring-accent lg:hidden"
        >
          ☰
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium text-fg">
            {current?.label ?? 'Gas Town'}
          </h1>
          {current && (
            <p className="truncate font-mono text-2xs text-faint">{current.objectLabel}</p>
          )}
        </div>
        {isFetching && <Spinner className="h-3 w-3 shrink-0" />}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {data?.overseer?.name && (
          <span className="hidden font-mono text-2xs text-faint sm:inline">
            {data.overseer.name}
          </span>
        )}
        <Button
          variant="default"
          size="sm"
          onClick={open}
          className="gap-2 text-muted"
          aria-label="Open command palette"
        >
          <span className="font-mono text-xs sm:hidden">⌘K</span>
          <span className="hidden text-xs sm:inline">Command</span>
          <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
        </Button>
      </div>
    </header>
  );
}
