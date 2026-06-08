#!/usr/bin/env bash
# Refresh the :8080 preview to latest origin/master.
# Run this whenever new work lands and you want the preview current.
# Idempotent: safe to run multiple times.

set -euo pipefail
CREW_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$CREW_DIR"

echo "=== gastown_gui preview refresh ==="
echo "Dir: $CREW_DIR"

# 1. Pull latest master
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)
if [ "$LOCAL" = "$REMOTE" ]; then
  echo "Already on latest master ($LOCAL), checking if processes need restart..."
else
  echo "Pulling $(git rev-parse --short HEAD)..$(git rev-parse --short origin/master)"
  git pull --ff-only
  echo "Now at: $(git log --oneline -1)"
fi

# 2. Reinstall deps if package.json or lockfile changed
DEPS_CHANGED=0
if git diff HEAD@{1} HEAD -- package.json package-lock.json 2>/dev/null | grep -q .; then
  DEPS_CHANGED=1
  echo "Root deps changed, running npm install..."
  npm install --silent
fi
if git diff HEAD@{1} HEAD -- web/package.json web/package-lock.json 2>/dev/null | grep -q .; then
  DEPS_CHANGED=1
  echo "Web deps changed, running npm install in web/..."
  (cd web && npm install --silent)
fi

# 3. Kill stale processes
kill $(lsof -ti :8080) 2>/dev/null && echo "Killed stale Vite on :8080" || true
kill $(lsof -ti :7667) 2>/dev/null && echo "Killed stale server.js on :7667" || true
sleep 1

# 4. Restart backend
setsid node server.js > /tmp/gastown-server.log 2>&1 &
SERVER_PID=$!
echo "Started server.js PID $SERVER_PID"

# 5. Restart Vite
(cd web && setsid npm run dev -- --host 0.0.0.0 --port 8080 > /tmp/gastown-vite.log 2>&1 &)
sleep 5
VITE_PID=$(lsof -ti :8080 2>/dev/null | head -1)
echo "Started Vite PID $VITE_PID"

# 6. Verify
HEALTH=$(curl -sf http://localhost:7667/api/health || echo "FAIL")
VITE_STATUS=$(curl -so /dev/null -w "%{http_code}" http://localhost:8080 || echo "FAIL")
echo "Backend health: $HEALTH"
echo "Vite status: $VITE_STATUS"
echo "=== Done. $(git log --oneline -1) ==="
