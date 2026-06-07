# Gas Town — Web Console

The modern React frontend for the Gas Town control console. It is the primary
frontend target for the app now; the existing Express bridge server
(`../server.js`) remains the backend and serves `dist/` in production, falling
back to the legacy SPA only when `web/dist` has not been built yet.

**Stack:** React + TypeScript + Vite + Tailwind + TanStack Router + TanStack Query.

## Develop

The Vite dev server proxies `/api` and `/ws` to the Express bridge, so run both:

```bash
# Terminal 1 — the gt bridge backend (repo root)
npm start                       # serves the API + built frontend on :8080

# Terminal 2 — the React app (this directory)
cd web
npm install
npm run dev                     # http://localhost:5173  (API proxied to :8080)
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

From the repo root, the same lifecycle is available as `npm run build`,
`npm run lint`, `npm run typecheck`, and `npm run test:web`.

## Layout

```
src/
  app/                  App shell, sidebar, top bar, navigation config
  components/
    primitives/         The TS+Tailwind component library (tokens-driven)
    command-palette/    Command palette + provider (mod+k, g _ sequences)
    Surface.tsx         Page-level container
  features/
    dashboard/          The reference surface
    placeholder/        Temporary stand-ins for unfinished surfaces
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

## Runtime boundary

The React app is the intended runtime frontend. Some surfaces are still lighter
than others, but the production server now prefers `web/dist` and only falls
back to the legacy SPA when the build output is missing. During development,
use the Vite proxy for HMR against the same Express backend.
