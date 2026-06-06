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
import { PlaceholderSurface } from '@/features/placeholder/PlaceholderSurface';

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
const workRoute = stub(
  '/work',
  'Work',
  'The work queue — open beads, convoys, dispatch and reassignment, sorted by what needs the operator.',
);
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  activityRoute,
  rigsRoute,
  workRoute,
  mailRoute,
  escalationsRoute,
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
