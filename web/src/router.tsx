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
const mailRoute = stub(
  '/mail',
  'Mail',
  'Agent mail and escalations: inbox, threads, compose and reply.',
);
const escalationsRoute = stub(
  '/escalations',
  'Escalations',
  'Pending escalations awaiting authorization, ranked by severity.',
);
const terminalRoute = stub(
  '/terminal',
  'Terminal',
  'Attach to an agent tmux session in the browser via the PTY-over-websocket bridge (xterm.js).',
);

const routeTree = rootRoute.addChildren([
  indexRoute,
  rigsRoute,
  workRoute,
  mailRoute,
  escalationsRoute,
  terminalRoute,
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
