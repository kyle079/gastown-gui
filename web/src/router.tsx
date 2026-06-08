import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { AppShell } from '@/app/AppShell';
import { CommandPaletteProvider } from '@/components/command-palette/CommandPaletteProvider';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { Fleet } from '@/features/fleet/Fleet';
import { RigDetailPage } from '@/features/fleet/RigDetailPage';
import { Help } from '@/features/help/Help';
import { MailSurface } from '@/features/mail/MailSurface';
import { MailMessagePage } from '@/features/mail/MailMessagePage';
import { WorkSurface } from '@/features/work/WorkSurface';
import { ConvoyDetailPage } from '@/features/work/ConvoyDetailPage';
import { CatalogRedirect } from '@/features/catalog/CatalogRedirect';
import { validateFormulasSearch } from '@/features/catalog/FormulasView';
import { validateIssuesSearch } from '@/features/catalog/IssuesView';
import { PullRequestsPage, validatePrsSearch } from '@/features/prs/PullRequestsPage';
import { PullRequestDetailPage } from '@/features/prs/PullRequestDetailPage';
import { TerminalSurface } from '@/features/terminal/TerminalSurface';
import { InvestigateSurface, validateInvestigateSearch } from '@/features/investigate/InvestigateSurface';

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

// ── Primary surfaces ────────────────────────────────────────────────────────

// Overview — system health at a glance.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

// Needs Attention — unified queue: mail, escalations, blocked work.
const attentionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/attention',
  component: MailSurface,
});

const attentionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/attention/$messageId',
  component: MailMessagePage,
});

// Dispatch — create, route, and confirm new work.
const dispatchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dispatch',
  component: WorkSurface,
});

const dispatchDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dispatch/$convoyId',
  component: ConvoyDetailPage,
});

// Fleet — supervise rigs and agents.
const fleetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fleet',
  component: Fleet,
});

const fleetDetailRoute = createRoute({
  getParentRoute: () => fleetRoute,
  path: '$rig',
  component: RigDetailPage,
});

// Landing — PR queue and merge queue.
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landing',
  validateSearch: validatePrsSearch,
  component: PullRequestsPage,
});

const landingDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landing/$owner/$repo/$prNumber',
  component: PullRequestDetailPage,
});

// Investigate — timeline, issues, formulas, and dependency graph.
const investigateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/investigate',
  validateSearch: validateInvestigateSearch,
  component: InvestigateSurface,
});

// Help — documentation and getting started.
const helpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/help',
  component: Help,
});

// Terminal — kept as a deep link; removed from primary nav.
const terminalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terminal',
  component: TerminalSurface,
});

// ── Legacy redirects ─────────────────────────────────────────────────────────
// Old routes redirect to their new homes. Deep links are preserved.

const mailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mail',
  beforeLoad: () => { throw redirect({ to: '/attention' }); },
});

const mailDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mail/$messageId',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/attention/$messageId', params: { messageId: params.messageId } });
  },
});

const rigsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rigs',
  beforeLoad: () => { throw redirect({ to: '/fleet' }); },
});

const rigDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rigs/$rig',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/fleet/$rig', params: { rig: params.rig } });
  },
});

const workRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/work',
  beforeLoad: () => { throw redirect({ to: '/dispatch' }); },
});

const workDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/work/$convoyId',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/dispatch/$convoyId', params: { convoyId: params.convoyId } });
  },
});

const prsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prs',
  beforeLoad: () => { throw redirect({ to: '/landing', search: { state: 'open' as const } }); },
});

const prDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prs/$owner/$repo/$prNumber',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/landing/$owner/$repo/$prNumber',
      params: { owner: params.owner, repo: params.repo, prNumber: params.prNumber },
    });
  },
});

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activity',
  beforeLoad: () => { throw redirect({ to: '/investigate', search: { mode: 'timeline' } }); },
});

const issuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/issues',
  validateSearch: validateIssuesSearch,
  beforeLoad: () => { throw redirect({ to: '/investigate', search: { mode: 'issues' } }); },
});

const formulasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/formulas',
  validateSearch: validateFormulasSearch,
  beforeLoad: () => { throw redirect({ to: '/investigate', search: { mode: 'formulas' } }); },
});

const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/graph',
  beforeLoad: () => { throw redirect({ to: '/investigate', search: { mode: 'graph' } }); },
});

const opsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ops',
  beforeLoad: () => { throw redirect({ to: '/attention' }); },
});

// Legacy Catalog route.
const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog',
  component: CatalogRedirect,
});

// Escalations — already redirected to mail, now chain to attention.
const escalationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/escalations',
  beforeLoad: () => { throw redirect({ to: '/attention' }); },
});

const escalationDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/escalations/$messageId',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/attention/$messageId', params: { messageId: params.messageId } });
  },
});

const routeTree = rootRoute.addChildren([
  // Primary surfaces
  indexRoute,
  attentionRoute,
  attentionDetailRoute,
  dispatchRoute,
  dispatchDetailRoute,
  fleetRoute.addChildren([fleetDetailRoute]),
  landingRoute,
  landingDetailRoute,
  investigateRoute,
  helpRoute,
  terminalRoute,
  // Legacy redirects
  mailRoute,
  mailDetailRoute,
  rigsRoute,
  rigDetailRoute,
  workRoute,
  workDetailRoute,
  prsRoute,
  prDetailRoute,
  activityRoute,
  issuesRoute,
  formulasRoute,
  graphRoute,
  opsRoute,
  catalogRoute,
  escalationsRoute,
  escalationDetailRoute,
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
