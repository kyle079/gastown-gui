#!/usr/bin/env bash
# Polling helper called by gastown-gui-autodeploy.service every 5 minutes.
# Deploys only when origin/master has new commits. No-ops otherwise.

set -euo pipefail

CREW_DIR="/home/kyle/gt/gastown_gui/crew/kyle"

cd "$CREW_DIR"

git fetch origin master --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

echo "New commit on origin/master: $(git rev-parse --short "$REMOTE") — deploying..."
exec bash scripts/deploy.sh
