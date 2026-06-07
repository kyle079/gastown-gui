# Gas Town GUI

[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/web3dev1337)

A standalone web GUI for [Gas Town](https://github.com/steveyegge/gastown) - the multi-agent orchestration system for Claude Code.

![Gas Town GUI Screenshot](assets/screenshot.png)

![Gas Town Loading Screen](assets/loading-background.jpeg)

> **Note:** This is an independent companion project, not part of the official Gas Town repository. Originally submitted as [PR #212](https://github.com/steveyegge/gastown/pull/212), now maintained as a standalone package per Steve's recommendation.

Support ongoing development: **[github.com/sponsors/web3dev1337](https://github.com/sponsors/web3dev1337)**

> *"Thank you for the impressive work on this GUI! The effort and thought that went into it is clear - the architecture is clean, the documentation is thorough, and it demonstrates a solid understanding of Gas Town's workflow. [...] If you're interested in continuing this work, I'd encourage publishing it as a standalone companion project."*
>
> — **Steve Yegge**, creator of Gas Town ([PR #212 comment](https://github.com/steveyegge/gastown/pull/212))

**Status:** 🚧 **Candidate for Testing** - Provides a solid starting point for a Gas Town GUI interface.

---

## Quick Start

### 1. Install Prerequisites

```bash
# Gas Town CLI (required)
npm install -g @gastown/gt
# Or: go install github.com/steveyegge/gastown/cmd/gt@latest

# GitHub CLI (optional, for PR tracking)
gh auth login
```

### 2. Install Gas Town GUI

```bash
# Via npm (recommended)
npm install -g gastown-gui

# Or from source
git clone https://github.com/web3dev1337/gastown-gui.git
cd gastown-gui
npm install
npm link
```

### 3. Start the GUI

```bash
gastown-gui start --open
```

Opens `http://localhost:7667` in your browser.

### 4. Verify Setup

```bash
gastown-gui doctor
```

## Mayor Preview Auto-Refresh

The LAN preview at `http://192.168.2.40:8080/` is expected to run from the
dedicated checkout at `/home/kyle/gt/gastown_gui/mayor/rig`. To keep that preview
current after refinery merges land:

```bash
# Manual trigger from the preview checkout
bash /home/kyle/gt/gastown_gui/mayor/rig/scripts/refresh-preview.sh --force

# Install the polling loop on the mayor box
cp scripts/gastown-gui-autodeploy.service /etc/systemd/system/
cp scripts/gastown-gui-autodeploy.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now gastown-gui-autodeploy.timer
```

What the refresh script does:

- Fast-forwards the `mayor/rig` checkout to `origin/master` only when the checkout is clean
- Refuses to overwrite dirty or diverged local state
- Runs `npm ci` in the repo root and `web/` when the relevant lockfiles change or `node_modules` is missing
- Restarts `server.js` on `:7667` and the Vite dev server on `:8080`
- Writes operator logs to `.runtime/logs/preview-refresh.log`, `.runtime/logs/preview-backend.log`, and `.runtime/logs/preview-vite.log`

---

## Nix / NixOS

### Build with Nix flake

```bash
nix build .#gastown-gui
./result/bin/gastown-gui start
```

### Run as a NixOS service

Import the module from this repository's flake and enable it:

```nix
{
  inputs.gastown-gui.url = "github:web3dev1337/gastown-gui";

  outputs = { self, nixpkgs, gastown-gui, ... }: {
    nixosConfigurations.my-host = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        gastown-gui.nixosModules.deployment
        ({
          services.gastown-gui = {
            enable = true;
            host = "127.0.0.1";
            port = 7667;
            openFirewall = false; # keep false when reverse-proxying locally

            # Optional: add runtime tools to PATH for service subprocesses
            # gtPackage = pkgs.gastown-gt;
            # beadsPackage = pkgs.beads;

            # Defaults: create and run as system user/group "gastown"
            # user = "gastown";
            # group = "gastown";
            # createUser = true;
            # createGroup = true;

            # Optional: where your Gas Town rigs live
            # gtRoot = "/var/lib/gastown/gt";

            # Optional: extra env vars
            # environment = { CORS_ORIGINS = "http://localhost:3000"; };
          };
        })
      ];
    };
  };
}
```

Then rebuild your system:

```bash
sudo nixos-rebuild switch --flake .#my-host
```

Service hardening defaults are enabled in the module (for example `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem`).

---

## Features

- **Dashboard** - Attention-first town overview with metrics, rig health, services, and scheduler status
- **Activity** - Live event stream for recent system activity
- **Fleet** - Severity-sorted rig list with rig detail drill-down
- **Work** - Convoy queue, dispatch flow, and convoy detail views
- **Catalog** - Browse issues and formulas with deep-linkable filters
- **Pull Requests** - Review repository PR lists and drill into PR details
- **Mail & Escalations** - Read inbox traffic, triage escalations, and compose responses
- **Terminal** - Attach to agent sessions from the browser
- **Graph** - Inspect bead dependency relationships visually
- **Help** - Built-in Gas Town glossary, workflow, and readiness guidance
- **Real-Time Updates** - Live HTTP/WebSocket-backed status and activity refresh

---

## CLI Usage

```bash
# Start server (default port 7667)
gastown-gui

# Custom port
gastown-gui start --port 4000

# Open browser automatically
gastown-gui start --open

# Development mode
gastown-gui start --dev

# Check prerequisites
gastown-gui doctor

# Show version
gastown-gui version

# Show help
gastown-gui help
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--port, -p` | Server port | 7667 |
| `--host, -h` | Server host | 127.0.0.1 |
| `--open, -o` | Open browser | false |
| `--dev` | Development mode | false |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GASTOWN_PORT` | Server port | 7667 |
| `HOST` | Server host | 127.0.0.1 |
| `GT_ROOT` | Gas Town root directory | ~/gt |
| `GT_BIN` | Override `gt` executable path | auto-detect (`PATH`, `~/.local/bin/gt`, `/opt/homebrew/bin/gt`, `/usr/local/bin/gt`) |
| `BD_BIN` | Override `bd` executable path | auto-detect (`PATH`, `~/.local/bin/bd`, `/opt/homebrew/bin/bd`, `/usr/local/bin/bd`) |

When `GT_BIN` or `BD_BIN` resolve outside the server's inherited `PATH`, the backend prepends those executable directories to subprocess `PATH` so `gt` subcommands that shell out to `bd` still work, including bridge-driven mail inbox requests and setup readiness checks. If you install either tool in a non-standard location, set the matching override env var to the absolute executable path. Changes to `PATH`, `GT_BIN`, or `BD_BIN` are picked up at bridge startup, so restart or redeploy the bridge after changing them.

### GitHub OAuth (for PR/issue data enrichment)

Register a **GitHub OAuth App** at https://github.com/settings/applications/new.

- **Homepage URL:** your deployed app URL (e.g., `https://your-host:7667`)
- **Authorization callback URL:** `https://your-host:7667/auth/github/callback`
  - ⚠️ This URL must be set in the OAuth App settings AND match `GITHUB_OAUTH_CALLBACK_URL` exactly.

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_OAUTH_CLIENT_ID` | OAuth App client ID | *(required for GitHub connect)* |
| `GITHUB_OAUTH_CLIENT_SECRET` | OAuth App client secret | *(required — never commit)* |
| `GITHUB_OAUTH_CALLBACK_URL` | Full callback URL | inferred from request host |
| `GITHUB_ALLOWLIST` | Comma-separated GitHub logins allowed to connect | `kyle079` |
| `SESSION_SECRET` | Secret for signing session cookies | `gastown-dev-secret-change-in-prod` *(change in production!)* |
| `GITHUB_TOKEN` | Fallback server-side token for background operations | *(optional)* |

---

## How It Works

The GUI acts as a **bridge** between your browser and the Gas Town CLI:

```
┌─────────────┐
│   Browser   │
│   (Client)  │
└──────┬──────┘
       │ HTTP API / WebSocket
       ↓
┌─────────────┐
│  gastown-   │
│  gui server │
└──────┬──────┘
       │ subprocess (gt, bd, gh)
       ↓
┌─────────────┐
│   ~/gt/     │
│  workspace  │
└─────────────┘
```

All operations execute through the official `gt` and `bd` commands - the GUI never directly modifies Gas Town's internal state.

---

## Architecture

### Tech Stack

- **Backend:** Node.js + Express bridge over `gt`, `bd`, `gh`, `git`, and tmux
- **Primary frontend:** React + TypeScript + Vite + Tailwind + TanStack Router/Query (`web/`)
- **Fallback frontend:** Legacy vanilla JS SPA (`js/`, `css/`, `index.html`) when `web/dist` is not present
- **Communication:** HTTP API + WebSocket for real-time updates
- **Testing:** Vitest unit/integration tests, Vitest browser coverage for the React app, and Puppeteer E2E tests

### Design Principles

1. **Server-Authoritative** - All operations execute via `gt` and `bd` CLI commands
2. **Non-Blocking UI** - Modals close immediately, operations run in background
3. **Real-Time Updates** - WebSocket broadcasts status changes to all clients
4. **Graceful Degradation** - UI handles missing data and command failures
5. **Cache & Refresh** - Background data preloading with stale-while-revalidate

---

## API Endpoints

| Method | Endpoint | Description | CLI Command |
|--------|----------|-------------|-------------|
| GET | `/api/status` | System status | `gt status --json` |
| GET | `/api/rigs` | List rigs | `gt rig list` |
| POST | `/api/rigs` | Add rig | `gt rig add` |
| GET | `/api/work` | List work items | `bd list` |
| POST | `/api/work` | Create work | `bd new` |
| POST | `/api/sling` | Sling work | `gt sling` |
| GET | `/api/prs` | GitHub PRs | `gh pr list` |
| GET | `/api/mail` | Mail inbox | `gt mail inbox` |
| GET | `/api/doctor` | Health check | `gt doctor` |

---

## Project Structure

```
gastown-gui/
├── bin/cli.js           # CLI entry point
├── server.js            # Express + WebSocket bridge server
├── server/              # Routes, services, gateways, infrastructure
├── web/                 # React + TS + Vite frontend
│   └── src/
│       ├── app/         # Shell, top bar, sidebar, navigation
│       ├── components/  # Primitives + command palette
│       ├── features/    # Dashboard, fleet, work, mail, PRs, graph, help, terminal
│       ├── lib/         # API client, query hooks, keyboard, utils
│       └── styles/      # Design tokens + global styles
├── js/                  # Legacy SPA fallback
├── css/                 # Legacy SPA styles
├── test/                # Unit, integration, and E2E coverage
├── assets/              # Favicons, screenshots, loading art
└── docs/                # Audits, architecture notes, and reviews
```

---

## Testing

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

---

## Delivery Notes

- The Express server prefers the built React frontend at `web/dist` when present.
- If `web/dist/index.html` is missing, the server falls back to the legacy SPA in the repo root.
- The React app is the current information architecture and active product surface; the legacy SPA remains as a compatibility fallback while the bridge server still serves both asset trees.

---

## Compatibility

- **Gas Town:** v0.2.x and later
- **Node.js:** 18, 20, 22
- **Browsers:** Chrome, Firefox, Safari (latest)

The GUI calls CLI commands via subprocess, so it should work with any Gas Town version that has compatible CLI output.

---

## Contributing

Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Update `CLAUDE.md`** if you add, rename, or delete files
5. Test locally (start server with `npm start`, verify in browser)
6. Run automated tests: `npm test` (206 tests must pass)
7. Submit a pull request

### Looking for Maintainers

We're looking for maintainers to help review and merge PRs. If you're interested in helping maintain this project, please open an issue or reach out!

---

## License

MIT

---

## Credits

- **Gas Town:** [steveyegge/gastown](https://github.com/steveyegge/gastown) by Steve Yegge
- **GUI Implementation:** Built with Claude Code
- **Original PR:** [#212](https://github.com/steveyegge/gastown/pull/212)

### Contributors

Thanks to these community members who contributed to the original PR through testing, comments, and recommended fixes:

- [@gsxdsm](https://github.com/gsxdsm)
- [@michaellady](https://github.com/michaellady)
- [@olivierlefloch](https://github.com/olivierlefloch)
- [@zalo](https://github.com/zalo)
- [@irelandpaul](https://github.com/irelandpaul)
- [@yougotborked](https://github.com/yougotborked) (PR #27 foundation work)

---

**Disclaimer:** This is an independent community project, not officially affiliated with Gas Town. Use at your own risk.
