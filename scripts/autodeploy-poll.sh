#!/usr/bin/env bash
# Poller entrypoint for systemd. It delegates to refresh-preview.sh and only
# restarts the preview when origin/master has advanced or the preview is unhealthy.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/refresh-preview.sh"
