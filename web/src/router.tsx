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
import { OpsSurface } from '@/features/ops/OpsSurface';
import { CatalogRedirect } from '@/features/catalog/CatalogRedirect';
import { FormulasView, validateFormulasSearch } from '@/features/catalog/FormulasView';
import { IssuesView, validateIssuesSearch } from '@/features/catalog/IssuesView';
import { PullRequestsPage, validatePrsSearch } from '@/features/prs/PullRequestsPage';
import { PullRequestDetailPage } from '@/features/prs/PullRequestDetailPage';
import { TerminalSurface } from '@/features/terminal/TerminalSurface';
import { BeadGraph } from '@/features/graph/BeadGraph';

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

// Legacy Catalog route kept as a redirect so old deep links still resolve.
const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog',
  component: CatalogRedirect,
});

const issuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/issues',
  validateSearch: validateIssuesSearch,
  component: IssuesView,
});

const formulasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/formulas',
  validateSearch: validateFormulasSearch,
  component: FormulasView,
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

const opsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ops',
  component: OpsSurface,
});

const workDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/work/$convoyId',
  component: ConvoyDetailPage,
});

// Pull requests — own top-level page with state/query search params.
const prsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prs',
  validateSearch: validatePrsSearch,
  component: PullRequestsPage,
});

// PR detail — routed full-page view at /prs/$owner/$repo/$prNumber.
const prDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prs/$owner/$repo/$prNumber',
  component: PullRequestDetailPage,
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
  component: TerminalSurface,
});

// Bead dependency graph.
const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/graph',
  component: BeadGraph,
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
  issuesRoute,
  formulasRoute,
  rigsRoute.addChildren([rigDetailRoute]),
  workRoute,
  opsRoute,
  workDetailRoute,
  prsRoute,
  prDetailRoute,
  mailRoute,
  mailDetailRoute,
  escalationsRoute,
  escalationDetailRoute,
  terminalRoute,
  graphRoute,
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
