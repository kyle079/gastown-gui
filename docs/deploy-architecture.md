# Deployment Architecture: gastown-gui CI/CD

## Overview

This document describes the CI/CD pipeline and hosting architecture for gastown-gui,
replacing the manual `refresh-preview.sh` approach.

---

## Data-Plane Decision: How the Bridge Reaches gt State

The Node.js bridge (`server.js`) shells out to `gt` and `bd` executables. These CLIs
depend on the Gas Town runtime environment: Dolt on port 3307, tmux sessions, `~/gt`
directory structure — all of which live on the **mayor LXC (LXC 400, 192.168.2.40)**.

**Three candidate approaches were evaluated:**

| Approach | Description | Verdict |
|----------|-------------|---------|
| A: Bridge on mayor, frontend on app host | Bridge stays on mayor; nginx on app host serves static assets and proxies `/api` + `/ws` to bridge | **CHOSEN** |
| B: Bridge on app host, SSH-exec to mayor | Bridge calls `gt`/`bd` via SSH on every request | Adds latency, complexity, credential rotation risk |
| C: Bridge on app host, SSHFS mount | App host mounts `~/gt` via SSHFS; `gt`/`bd` installed on app host | SSHFS unreliable under load, requires keeping gt/bd in sync on two hosts |

**Decision: Option A (Hybrid Deployment)**

- `server.js` (bridge) continues running on the mayor LXC — no code changes required
- The React frontend is Vite-built to static assets and served from a new **App Host LXC**
- nginx on the app host:
  - Serves `web/dist/` static files at `/`
  - Proxies `/api/*` → `http://192.168.2.40:7667`
  - Proxies `/ws` → `ws://192.168.2.40:7667` (websocket upgrade)

This completely eliminates the stale-preview problem: every merge to master triggers a
fresh Vite build + rsync to the app host. The bridge on mayor is restarted independently
via systemd (managed outside CI/CD, not frequently needed).

---

## Proxmox LXC Topology

```
pve (192.168.1.200)
├── LXC 400  mayor box  (192.168.2.40)  ← bridge (server.js) stays here
│                                          gt/bd/dolt live here
│                                          DO NOT touch with CI/CD
├── LXC 401  gg-runner  (192.168.2.41)  ← GitHub Actions self-hosted runner
│                                          node LTS, git, npm
│                                          builds the Vite app
│                                          SEPARATE from LXC 400
└── LXC 402  gg-app     (192.168.2.42)  ← nginx serves web/dist/ static assets
                                           proxies /api + /ws to LXC 400:7667
                                           receives rsync deploys from runner
```

**Runner LXC 401 (gg-runner, 192.168.2.41)** — provisioned via `scripts/provision-runner.sh`:
- OS: Ubuntu 24.04 LTS
- Resources: 4 vCPU, 4 GB RAM, 20 GB disk
- Packages: `nodejs` 20 LTS, `npm`, `git`, `curl`, `rsync`
- GitHub Actions runner registered to `kyle079/gastown-gui`, labels: `self-hosted,linux,gg-runner`
- NOT on LXC 400 — keeps build load off the agent fleet

**App Host LXC 402 (gg-app, 192.168.2.42)** — provisioned via `scripts/provision-apphost.sh`:
- OS: Ubuntu 24.04 LTS
- Resources: 1 vCPU, 512 MB RAM, 8 GB disk
- Packages: `nginx` only (no Node, no build tools)
- Serves Vite static assets + proxies bridge on mayor
- SSH access via `deploy` user (key-based) for rsync from runner

**Runner vs. App Host: separate LXCs (recommended)**
Rationale: builds are CPU/IO-intensive and transient; the app host should be stable
and always-up. Mixing them means a hung build can starve the nginx process.

---

## CI Pipeline (PR Checks)

File: `.github/workflows/ci.yml`
Triggers: all pull_request events targeting `master`

Steps (all must pass — merge blocked on red):
1. `npm ci` (root — bridge dependencies)
2. `cd web && npm ci` (frontend dependencies)
3. `cd web && npm run typecheck` (TypeScript strict-mode check)
4. `cd web && npm run build` (Vite production build — catches build-time errors)
5. `cd web && npm run lint` (ESLint, max-warnings 0)
6. Root unit tests: `npm run test:unit`

Runner: self-hosted (Proxmox runner LXC) once provisioned; falls back to `ubuntu-latest`
during bootstrap.

---

## CD Pipeline (Deploy on Merge)

File: `.github/workflows/deploy.yml`
Trigger: `push` to `master`

Steps:
1. Checkout, `npm ci` (root + web)
2. `cd web && npm run build` → produces `web/dist/`
3. `rsync -az --delete web/dist/ deploy@<APP_HOST>:/opt/gastown-gui/dist/`
4. SSH to app host: `sudo nginx -s reload` (picks up new static files)
5. Health check: `curl -f http://<APP_HOST>/api/health`

Secrets required (configured in GitHub → Settings → Secrets):
- `DEPLOY_KEY` — SSH private key for rsync to app host
- `APP_HOST` — IP/hostname of the app host LXC

Runner: self-hosted (Proxmox runner LXC) — must be online for deploys to run.

---

## nginx Configuration (App Host)

Template: `scripts/nginx-gastown-gui.conf`

```nginx
server {
    listen 80;
    server_name _;

    root /opt/gastown-gui/dist;
    index index.html;

    # SPA fallback — all non-file requests serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy REST API to bridge on mayor
    location /api/ {
        proxy_pass http://192.168.2.40:7667;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy WebSocket to bridge on mayor
    location /ws {
        proxy_pass http://192.168.2.40:7667;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## Rollback

Each deploy rsync's the full `web/dist/` directory. Rollback procedure:
1. Find the last working commit: `git log --oneline`
2. On the runner box (or locally): `git checkout <commit> && cd web && npm run build`
3. rsync the old build to app host, reload nginx

A future improvement: keep timestamped releases in `/opt/gastown-gui/releases/` with
a `current` symlink — instant rollback via symlink swap.

---

## Health Check

The bridge exposes `/api/health` and `/api/ready` (added in gg-4qz). After every deploy
the CD pipeline hits this endpoint via the app host. A non-200 response fails the workflow
and alerts via GitHub Actions notification.

---

## Human Steps Required

The following require action by the human operator:

1. **Get GitHub runner registration token**:
   - Go to: `https://github.com/kyle079/gastown-gui/settings/actions/runners/new`
   - Copy the registration token (expires in 1 hour)

2. **Provision runner LXC 401** on pve (`ssh root@192.168.1.200`):
   ```bash
   bash scripts/provision-runner.sh --token <RUNNER_TOKEN>
   ```
   Verify at: `https://github.com/kyle079/gastown-gui/settings/actions/runners`

3. **Generate deploy SSH key pair**:
   ```bash
   ssh-keygen -t ed25519 -C "gg-deploy" -f ~/.ssh/gg_deploy -N ""
   ```
   - Public key → used in next step
   - Private key → GitHub secret `DEPLOY_KEY`

4. **Provision app host LXC 402** on pve:
   ```bash
   bash scripts/provision-apphost.sh --pubkey "$(cat ~/.ssh/gg_deploy.pub)"
   ```

5. **Configure GitHub Secrets** (repo → Settings → Secrets → Actions):
   - `DEPLOY_KEY`: `cat ~/.ssh/gg_deploy` (private key)
   - `APP_HOST`: `192.168.2.42`

6. **Install bridge systemd service on LXC 400** (mayor box):
   ```bash
   sudo cp scripts/gastown-bridge.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now gastown-bridge
   ```
   Verify: `ss -tlnp | grep 7667` should show `0.0.0.0:7667` (not `127.0.0.1`)

7. **DNS/bookmark**: Replace `http://192.168.2.40:8080` with `http://192.168.2.42` (port 80).
