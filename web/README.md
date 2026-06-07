# Gas Town — Web Console

The React frontend for the Gas Town control console. This app defines the
current information architecture and ships through the existing Express bridge
server (`../server.js`) when `web/dist` is present.

**Stack:** React + TypeScript + Vite + Tailwind + TanStack Router + TanStack Query.

## Develop

The Vite dev server proxies `/api` and `/ws` to the Express bridge, so run both:

```bash
# Terminal 1 — the gt bridge backend (repo root)
npm start                       # serves the legacy app + the API on :7667

# Terminal 2 — the React app (this directory)
cd web
npm install
npm run dev                     # http://localhost:5173  (API proxied to :7667)
```

Point the proxy at a different backend port with `GASTOWN_PORT` (see `vite.config.ts`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with HMR + API/WS proxy |
| `npm run build` | Typecheck (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Types only, no emit |
| `npm run lint` | ESLint (zero-warning gate) |

## Layout

```
src/
  app/                  App shell, sidebar, top bar, navigation config
  components/
    primitives/         The TS+Tailwind component library (tokens-driven)
    command-palette/    Command palette + provider (mod+k, g _ sequences)
    Surface.tsx         Page-level container
  features/
    activity/           Live event stream
    catalog/            Issues and formulas
    dashboard/          Town overview
    fleet/              Rigs master/detail
    graph/              Bead dependency graph
    help/               Concepts, workflow, readiness
    mail/               Inbox, escalations, compose/detail dialogs
    prs/                Pull request list and detail
    terminal/           Browser terminal sessions
    work/               Convoys, dispatch, convoy detail
  lib/
    api/                Typed fetch client + gt API types
    query/              QueryClient, keys, data hooks
    keyboard/           Hotkey + key-sequence layer
    commands/           Command type
    utils/              cn(), formatters
  styles/               tokens.css (color source of truth) + index.css
  router.tsx            Code-based TanStack Router route tree
  main.tsx             Entry: Query + Toast providers + RouterProvider
```

Design tokens and the visual direction are documented in `../DESIGN.md`.

## Routes

The shipped top-level route tree is:

- `/` dashboard
- `/activity`
- `/rigs` and `/rigs/$rig`
- `/work` and `/work/$convoyId`
- `/catalog`
- `/prs` and `/prs/$owner/$repo/$prNumber`
- `/mail` and `/mail/$messageId`
- `/escalations` and `/escalations/$messageId`
- `/terminal`
- `/graph`
- `/help`

## Delivery

The Express bridge prefers `web/dist/index.html` and serves this React app when
that build artifact exists. If the dist output is absent, the server falls back
to the legacy root-level SPA. Develop the React app through the Vite proxy; ship
it by building `dist/`.
