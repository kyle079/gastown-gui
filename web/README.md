# Gas Town — Web Console (React rewrite)

The modern React frontend for the Gas Town control console. This is the Phase 0
foundation of a full rewrite of the GUI from vanilla JS to a React stack. The
existing Express bridge server (`../server.js`) remains the backend, unchanged.

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
    dashboard/          The Phase 0 reference surface
    placeholder/        Stand-ins for Phase 1 surfaces
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

## Phase boundary

Phase 0 ships the scaffold, design system, primitives, keyboard layer, app shell,
data layer, and **one** fully built surface (Dashboard) to prove the pattern.
The other nav entries are route stubs that Phase 1 fills in. Production serving of
`dist/` from the Express server (replacing the legacy SPA) is also a Phase 1 step;
until then, develop via the Vite proxy.
