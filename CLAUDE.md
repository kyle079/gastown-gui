# CLAUDE.md - Gas Town GUI

Web GUI for [steveyegge/gastown](https://github.com/steveyegge/gastown) multi-agent orchestrator.

## READ THESE ENTIRE DOCUMENTS BEFORE DOING ANYTHING

1. **Read `CODEBASE_DOCUMENTATION.md` NOW** — Complete file inventory. Do NOT grep blindly for files. Read this first so you know where everything lives.
2. **Read `CLI-COMPATIBILITY.md`** — Which gt/bd commands work, which are broken/remapped. Critical if touching any CLI calls.

> **Update before PR:** If you added/deleted/moved files, update CODEBASE_DOCUMENTATION.md.

## Overview

Browser SPA (vanilla JS, no framework) backed by an Express server that wraps `gt`/`bd` CLI commands as HTTP endpoints. WebSocket streams real-time events from `gt feed`. Published to npm as `gastown-gui`.

## Architecture

- **Entry:** `server.js` — monolith Express server, partially refactored into `server/` modules
- **Refactored path:** Gateway → Service → Route (see `server/gateways/`, `server/services/`, `server/routes/`)
- **Legacy endpoints:** Mail, agents, nudge, polecat control, service controls still inline in `server.js`
- **CLI safety:** All commands use `execFile` (no shell) + `SafeSegment` input validation
- **Frontend:** Vanilla JS in `js/`, components render via innerHTML, global state in `js/state.js`
- **Real-time:** WebSocket client in `js/api.js`, server pipes `gt feed --json` output
- **CLI entry:** `bin/cli.js` — supports `start`, `doctor`, `version`, `help`

## File Size Discipline

- **No god files/classes:** Do not keep adding logic to large files (especially `server.js`).
- **Extract by responsibility:** New backend logic should be placed in focused modules under `server/` (services/gateways/routes/infrastructure) and imported into `server.js`.
- **Refactor when touching:** If a change makes a file larger or more complex, extract helpers into dedicated files in the same PR.

## Commands

```bash
npm start              # Start server (port 7667)
npm run dev            # Dev mode with auto-reload
npm test               # All tests (unit + integration + e2e)
npm run test:unit      # Unit tests only
npm run test:e2e       # E2E tests only (needs Puppeteer)
npm run test:watch     # Watch mode
npm run test:ui        # Vitest UI
```

## Testing

- **Vitest** for unit + integration, **Puppeteer** for E2E
- Unit tests use dependency injection (mock gateways/services)
- Route tests use real Express app with mocked services
- Integration tests hit `test/mock-server.js` (mimics gt CLI responses)
- E2E tests start real server + Chromium browser
- `npm test` runs everything via `prepublishOnly` before npm publish

## Gotchas

1. **Witness/refinery need rig:** Service start/stop/restart for `witness` and `refinery` require a `rig` parameter in the request body. Mayor/deacon do not. Server returns 400 if missing.
2. **CLI renames:** Several gt/bd commands were renamed upstream. See `CLI-COMPATIBILITY.md` for the full mapping. Key ones: `formula use` → `formula run --rig`, `bd done` → `bd close`, `bd park` → `bd defer`.
3. **Port 7667:** Default port via `GASTOWN_PORT` env var. The CLI (`bin/cli.js`) also accepts `--port`.
4. **No build step:** Frontend is vanilla JS served as static files. No bundler, no transpiler.
5. **server.js is partially refactored:** Some endpoints moved to `server/routes/`, others still inline (~1700 lines). Don't duplicate — check both before adding endpoints.
6. **SafeSegment rejects metacharacters:** Any rig/agent name with shell-special chars will be rejected. This is intentional security.
7. **Mock server must match real server:** When adding/changing endpoints, update both `server.js` (or routes) AND `test/mock-server.js`.
