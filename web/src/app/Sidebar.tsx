import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS } from './navigation';
import { useStatus } from '@/lib/query/hooks';
import { StatusDot } from '@/components/primitives';

/**
 * Primary navigation rail. Quiet, structural, keyboard-discoverable
 * (each item shows its `g _` sequence). One job: move between surfaces.
 */
export function Sidebar() {
  const { location } = useRouterState();
  const { data } = useStatus();

  const daemonOk = data?.daemon?.running ?? false;
  const doltOk = data?.dolt?.running ?? false;

  return (
    <aside
      className="flex h-full flex-col border-r border-line bg-base"
      style={{ width: 'var(--sidebar-w)' }}
    >
      {/* Wordmark */}
      <div className="flex h-[var(--topbar-h)] items-center gap-2 border-b border-line px-4">
        <span className="font-mono text-sm font-semibold tracking-tight text-fg">
          gas<span className="text-accent">town</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const active =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'group flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm transition-colors',
                active ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
              )}
            >
              <span
                className={cn(
                  'w-4 text-center font-mono text-xs',
                  active ? 'text-accent' : 'text-faint group-hover:text-muted',
                )}
              >
                {item.glyph}
              </span>
              <span className="flex-1">{item.label}</span>
              {!item.ready && (
                <span className="font-mono text-2xs text-faint" title="Arrives in Phase 1">
                  soon
                </span>
              )}
              <kbd className="font-mono text-2xs text-faint opacity-0 transition-opacity group-hover:opacity-100">
                g {item.seq}
              </kbd>
            </Link>
          );
        })}
      </nav>

      {/* Service health footer */}
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center justify-between text-2xs text-faint">
          <span className="font-mono uppercase tracking-wider">services</span>
        </div>
        <div className="mt-2 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-2 text-muted">
            <StatusDot tone={daemonOk ? 'ok' : 'danger'} />
            daemon
          </div>
          <div className="flex items-center gap-2 text-muted">
            <StatusDot tone={doltOk ? 'ok' : 'danger'} />
            dolt
          </div>
        </div>
      </div>
    </aside>
  );
}
