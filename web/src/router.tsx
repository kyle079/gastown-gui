import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { AppShell } from '@/app/AppShell';
import { CommandPaletteProvider } from '@/components/command-palette/CommandPaletteProvider';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { Fleet } from '@/features/fleet/Fleet';
import { Help } from '@/features/help/Help';
import { ActivityFeed } from '@/features/activity/ActivityFeed';
import { MailSurface } from '@/features/mail/MailSurface';
import { EscalationsSurface } from '@/features/mail/EscalationsSurface';
import { WorkSurface } from '@/features/work/WorkSurface';
import { Catalog, isCatalogTab, type CatalogTab } from '@/features/catalog/Catalog';
import { PlaceholderSurface } from '@/features/placeholder/PlaceholderSurface';
import { GraphSurface } from '@/features/graph/GraphSurface';

/**
 * Code-based route tree (no codegen). The keyboard layer + shell live in the
 * root so they wrap every surface and sit inside router context.
 */
const rootRoute = createRootRoute({
  component: () => (
    <CommandPaletteProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </CommandPaletteProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

// Activity — first Phase 1 surface (live event stream).
const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activity',
  component: ActivityFeed,
});

// Catalog — Phase 1 surface: issues, PRs, and formulas. The active view is a
// validated search param so it deep-links and survives reload.
const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog',
  validateSearch: (search: Record<string, unknown>): { tab: CatalogTab } => ({
    tab: isCatalogTab(search.tab) ? search.tab : 'issues',
  }),
  component: Catalog,
});

// Phase 1 surfaces — route stubs so navigation is fully wired today.
const stub = (path: string, title: string, intent: string) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: () => <PlaceholderSurface title={title} intent={intent} />,
  });

const rigsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rigs',
  component: Fleet,
});
const workRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/work',
  component: WorkSurface,
});
const mailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mail',
  component: MailSurface,
});
const escalationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/escalations',
  component: EscalationsSurface,
});
const terminalRoute = stub(
  '/terminal',
  'Terminal',
  'Attach to an agent tmux session in the browser via the PTY-over-websocket bridge (xterm.js).',
);

// Help / Getting Started — the first surface Phase 1 actually builds out.
const helpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/help',
  component: Help,
});

// Bead Graph — interactive dependency graph.
const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/graph',
  component: GraphSurface,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  activityRoute,
  catalogRoute,
  rigsRoute,
  workRoute,
  mailRoute,
  escalationsRoute,
  graphRoute,
  terminalRoute,
  helpRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
