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
import { RigDetailPage } from '@/features/fleet/RigDetailPage';
import { Help } from '@/features/help/Help';
import { ActivityFeed } from '@/features/activity/ActivityFeed';
import { MailSurface } from '@/features/mail/MailSurface';
import { MailMessagePage } from '@/features/mail/MailMessagePage';
import { EscalationsSurface } from '@/features/mail/EscalationsSurface';
import { WorkSurface } from '@/features/work/WorkSurface';
import { ConvoyDetailPage } from '@/features/work/ConvoyDetailPage';
import { Catalog, validateCatalogSearch } from '@/features/catalog/Catalog';
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

// Activity — live event stream.
const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activity',
  component: ActivityFeed,
});

// Catalog — issues, PRs, and formulas. Tab, issue selection, and issue filters
// are all URL search params so every view deep-links and survives reload.
const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog',
  validateSearch: validateCatalogSearch,
  component: Catalog,
});

// Fleet — master/detail. /rigs renders the layout (list + outlet); /rigs/$rig
// renders the selected rig's detail in the outlet.
const rigsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rigs',
  component: Fleet,
});

const rigDetailRoute = createRoute({
  getParentRoute: () => rigsRoute,
  path: '$rig',
  component: RigDetailPage,
});

// Work — convoy list at /work; detail is a full-page view at /work/$convoyId.
const workRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/work',
  component: WorkSurface,
});

const workDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/work/$convoyId',
  component: ConvoyDetailPage,
});

// Mail — inbox at /mail; message detail at /mail/$messageId.
const mailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mail',
  component: MailSurface,
});

const mailDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mail/$messageId',
  component: MailMessagePage,
});

// Escalations — triage view at /escalations; detail at /escalations/$messageId.
const escalationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/escalations',
  component: EscalationsSurface,
});

const escalationDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/escalations/$messageId',
  component: MailMessagePage,
});

const terminalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terminal',
  component: () => (
    <PlaceholderSurface
      title="Terminal"
      intent="Attach to an agent tmux session in the browser via the PTY-over-websocket bridge (xterm.js)."
    />
  ),
});

// Help / Getting Started.
const helpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/help',
  component: Help,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  activityRoute,
  catalogRoute,
  rigsRoute.addChildren([rigDetailRoute]),
  workRoute,
  workDetailRoute,
  mailRoute,
  mailDetailRoute,
  escalationsRoute,
  escalationDetailRoute,
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
