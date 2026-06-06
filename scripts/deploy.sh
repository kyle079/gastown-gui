#!/usr/bin/env bash
# Deploy the latest origin/master to the live gastown-gui service.
#
# Idempotent: safe to run multiple times.
# Agents trigger this after a gastown MR lands.
#
# Usage:
#   bash scripts/deploy.sh
#
# The script must be run as (or with sudo rights for systemctl) the service user.

set -euo pipefail

CREW_DIR="/home/kyle/gt/gastown_gui/crew/kyle"
SERVICE="gastown-gui"

echo "=== gastown-gui deploy $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

cd "$CREW_DIR"

# 1. Pull latest master
git fetch origin master
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

PREV=$LOCAL
if [ "$LOCAL" = "$REMOTE" ]; then
  echo "Already at latest master ($(git rev-parse --short HEAD)), restarting service..."
else
  echo "Updating $(git rev-parse --short HEAD)..$(git rev-parse --short origin/master)"
  # Hard reset to origin/master — this is the deploy directory, not a dev workspace.
  git reset --hard origin/master
  echo "Now at: $(git log --oneline -1)"
fi

# 2. Reinstall deps if lockfile changed
if [ "$PREV" != "$REMOTE" ] && git diff "$PREV" HEAD -- package-lock.json 2>/dev/null | grep -q .; then
  echo "Dependencies changed, running npm ci..."
  npm ci --omit=dev --quiet
fi

# 3. Restart the service
echo "Restarting $SERVICE..."
sudo systemctl restart "$SERVICE"

# 4. Quick health check
sleep 2
if systemctl is-active --quiet "$SERVICE"; then
  echo "Service is running."
else
  echo "ERROR: $SERVICE failed to start" >&2
  sudo journalctl -u "$SERVICE" -n 20 --no-pager >&2
  exit 1
fi

echo "=== Done. $(git log --oneline -1) ==="
