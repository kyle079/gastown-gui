import { useRouterState } from '@tanstack/react-router';
import { Button, Kbd, Spinner } from '@/components/primitives';
import { useCommandPalette } from '@/components/command-palette/CommandPaletteProvider';
import { useStatus } from '@/lib/query/hooks';
import { NAV_ITEMS } from './navigation';

/** Top bar: current surface title, live status, command-palette launcher. */
export function TopBar() {
  const { open } = useCommandPalette();
  const { location } = useRouterState();
  const { data, isFetching } = useStatus();

  const current =
    NAV_ITEMS.find((n) =>
      n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path),
    )?.label ?? 'Gas Town';

  return (
    <header
      className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-base px-4"
      style={{ height: 'var(--topbar-h)' }}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-medium text-fg">{current}</h1>
        {isFetching && <Spinner className="h-3 w-3" />}
      </div>

      <div className="flex items-center gap-3">
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
          <span className="text-xs">Command</span>
          <Kbd>⌘K</Kbd>
        </Button>
      </div>
    </header>
  );
}
