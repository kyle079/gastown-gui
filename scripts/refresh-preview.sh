#!/usr/bin/env bash
# Keep the mayor preview checkout current with origin/master and restart the
# local API bridge (:7667) plus Vite preview (:8080) when needed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_REPO_DIR="/home/kyle/gt/gastown_gui/mayor/rig"

REPO_DIR="${PREVIEW_REPO_DIR:-$DEFAULT_REPO_DIR}"
BRANCH="${PREVIEW_BRANCH:-master}"
API_PORT="${PREVIEW_API_PORT:-7667}"
PREVIEW_PORT="${PREVIEW_PORT:-8080}"
PREVIEW_HOST="${PREVIEW_HOST:-0.0.0.0}"
GT_ROOT="${PREVIEW_GT_ROOT:-/home/kyle/gt}"
FORCE_REFRESH=0

usage() {
  cat <<'EOF'
Usage: scripts/refresh-preview.sh [options]

Options:
  --force               Restart the preview even when HEAD already matches origin/master
  --repo-dir <path>     Override the preview checkout path
  --branch <name>       Override the tracked branch (default: master)
  --api-port <port>     Override the API bridge port (default: 7667)
  --preview-port <port> Override the Vite preview port (default: 8080)
  --help                Show this help text
EOF
}

while (($# > 0)); do
  case "$1" in
    --force)
      FORCE_REFRESH=1
      shift
      ;;
    --repo-dir)
      REPO_DIR="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --api-port)
      API_PORT="$2"
      shift 2
      ;;
    --preview-port)
      PREVIEW_PORT="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Preview repo not found: $REPO_DIR" >&2
  exit 1
fi

RUNTIME_DIR="$REPO_DIR/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
LOCK_FILE="$RUNTIME_DIR/preview-refresh.lock"
MAIN_LOG="$LOG_DIR/preview-refresh.log"
BACKEND_LOG="$LOG_DIR/preview-backend.log"
FRONTEND_LOG="$LOG_DIR/preview-vite.log"
BACKEND_PID_FILE="$RUNTIME_DIR/preview-backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/preview-vite.pid"

mkdir -p "$LOG_DIR"

log() {
  local message="$1"
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$message" | tee -a "$MAIN_LOG"
}

fail() {
  log "ERROR: $1"
  exit 1
}

run_logged() {
  log "+ $*"
  "$@" >>"$MAIN_LOG" 2>&1
}

pid_is_running() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null
}

port_listener_pid() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

pid_belongs_to_repo() {
  local pid="$1"
  local cwd
  cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  [ -n "$cwd" ] && [[ "$cwd" == "$REPO_DIR" || "$cwd" == "$REPO_DIR/"* ]]
}

wait_for_exit() {
  local pid="$1"
  local label="$2"
  local deadline=20
  while pid_is_running "$pid"; do
    deadline=$((deadline - 1))
    if [ "$deadline" -le 0 ]; then
      log "$label PID $pid ignored SIGTERM, sending SIGKILL"
      kill -KILL "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      return
    fi
    sleep 1
  done
  wait "$pid" 2>/dev/null || true
}

stop_listener() {
  local label="$1"
  local pid_file="$2"
  local port="$3"
  local pid=""

  if [ -f "$pid_file" ]; then
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    rm -f "$pid_file"
    if [ -n "$pid" ] && pid_is_running "$pid"; then
      log "Stopping $label PID $pid"
      kill "$pid" 2>/dev/null || true
      wait_for_exit "$pid" "$label"
    fi
  fi

  pid="$(port_listener_pid "$port")"
  if [ -z "$pid" ]; then
    return
  fi

  if ! pid_belongs_to_repo "$pid"; then
    fail "$label port $port is occupied by unrelated PID $pid; refusing to kill it"
  fi

  log "Stopping $label listener PID $pid on port $port"
  kill "$pid" 2>/dev/null || true
  wait_for_exit "$pid" "$label"
}

wait_for_http() {
  local label="$1"
  local url="$2"
  local seconds="${3:-30}"
  while [ "$seconds" -gt 0 ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "$label is healthy at $url"
      return 0
    fi
    seconds=$((seconds - 1))
    sleep 1
  done
  fail "$label failed health check at $url. See $(basename "$MAIN_LOG"), $(basename "$BACKEND_LOG"), and $(basename "$FRONTEND_LOG") in $LOG_DIR"
}

ensure_clean_checkout() {
  local dirty
  dirty="$(git -C "$REPO_DIR" status --porcelain --untracked-files=normal)"
  if [ -n "$dirty" ]; then
    log "Dirty files prevent auto-refresh:"
    while IFS= read -r line; do
      log "  $line"
    done <<<"$dirty"
    fail "preview checkout has local changes; refusing to clobber them"
  fi
}

restart_preview() {
  stop_listener "backend" "$BACKEND_PID_FILE" "$API_PORT"
  stop_listener "vite preview" "$FRONTEND_PID_FILE" "$PREVIEW_PORT"

  : >"$BACKEND_LOG"
  : >"$FRONTEND_LOG"

  log "Starting backend on :$API_PORT"
  (
    cd "$REPO_DIR"
    exec 9>&-
    env HOST="$PREVIEW_HOST" GASTOWN_PORT="$API_PORT" GT_ROOT="$GT_ROOT" NODE_ENV=development \
      nohup node server.js >>"$BACKEND_LOG" 2>&1 &
    echo $! >"$BACKEND_PID_FILE"
  )

  log "Starting Vite preview on :$PREVIEW_PORT"
  (
    cd "$REPO_DIR/web"
    exec 9>&-
    env HOST="$PREVIEW_HOST" \
      nohup npm run dev -- --host "$PREVIEW_HOST" --port "$PREVIEW_PORT" --strictPort >>"$FRONTEND_LOG" 2>&1 &
    echo $! >"$FRONTEND_PID_FILE"
  )

  wait_for_http "backend" "http://127.0.0.1:$API_PORT/api/health" 30
  wait_for_http "preview" "http://127.0.0.1:$PREVIEW_PORT" 45
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another refresh is already running; skipping."
  exit 0
fi

log "=== preview refresh start repo=$REPO_DIR branch=$BRANCH force=$FORCE_REFRESH ==="

ensure_clean_checkout
run_logged git -C "$REPO_DIR" fetch origin "$BRANCH" --quiet

LOCAL_HEAD="$(git -C "$REPO_DIR" rev-parse HEAD)"
REMOTE_HEAD="$(git -C "$REPO_DIR" rev-parse "origin/$BRANCH")"
NEEDS_UPDATE=0
NEEDS_ROOT_INSTALL=0
NEEDS_WEB_INSTALL=0

if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  if ! git -C "$REPO_DIR" merge-base --is-ancestor "$LOCAL_HEAD" "$REMOTE_HEAD"; then
    fail "preview checkout diverged from origin/$BRANCH; only fast-forward updates are allowed"
  fi

  NEEDS_UPDATE=1
  PREVIOUS_HEAD="$LOCAL_HEAD"
  log "Fast-forwarding $(git -C "$REPO_DIR" rev-parse --short "$LOCAL_HEAD")..$(git -C "$REPO_DIR" rev-parse --short "$REMOTE_HEAD")"
  run_logged git -C "$REPO_DIR" merge --ff-only "origin/$BRANCH"
  CURRENT_HEAD="$(git -C "$REPO_DIR" rev-parse HEAD)"

  if ! git -C "$REPO_DIR" diff --quiet "$PREVIOUS_HEAD" "$CURRENT_HEAD" -- package.json package-lock.json; then
    NEEDS_ROOT_INSTALL=1
  fi

  if ! git -C "$REPO_DIR" diff --quiet "$PREVIOUS_HEAD" "$CURRENT_HEAD" -- web/package.json web/package-lock.json; then
    NEEDS_WEB_INSTALL=1
  fi
else
  CURRENT_HEAD="$LOCAL_HEAD"
fi

if [ ! -d "$REPO_DIR/node_modules" ]; then
  NEEDS_ROOT_INSTALL=1
fi

if [ ! -d "$REPO_DIR/web/node_modules" ]; then
  NEEDS_WEB_INSTALL=1
fi

if [ "$NEEDS_ROOT_INSTALL" -eq 1 ]; then
  log "Refreshing root dependencies"
  run_logged npm --prefix "$REPO_DIR" ci
fi

if [ "$NEEDS_WEB_INSTALL" -eq 1 ]; then
  log "Refreshing web dependencies"
  run_logged npm --prefix "$REPO_DIR/web" ci
fi

BACKEND_PID="$(port_listener_pid "$API_PORT")"
PREVIEW_PID="$(port_listener_pid "$PREVIEW_PORT")"
NEEDS_RESTART="$FORCE_REFRESH"

if [ "$NEEDS_UPDATE" -eq 1 ] || [ "$NEEDS_ROOT_INSTALL" -eq 1 ] || [ "$NEEDS_WEB_INSTALL" -eq 1 ]; then
  NEEDS_RESTART=1
fi

if [ -z "$BACKEND_PID" ] || [ -z "$PREVIEW_PID" ]; then
  NEEDS_RESTART=1
fi

if [ "$NEEDS_RESTART" -eq 0 ] && ! curl -fsS "http://127.0.0.1:$API_PORT/api/health" >/dev/null 2>&1; then
  NEEDS_RESTART=1
fi

if [ "$NEEDS_RESTART" -eq 0 ] && ! curl -fsS "http://127.0.0.1:$PREVIEW_PORT" >/dev/null 2>&1; then
  NEEDS_RESTART=1
fi

if [ "$NEEDS_RESTART" -eq 1 ]; then
  restart_preview
else
  log "Preview already healthy at $(git -C "$REPO_DIR" rev-parse --short "$CURRENT_HEAD"); no restart required."
fi

log "Preview now serving $(git -C "$REPO_DIR" log --oneline -1)"
log "Logs: $LOG_DIR"
log "=== preview refresh complete ==="
