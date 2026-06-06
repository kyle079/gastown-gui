#!/usr/bin/env bash
# Provision LXC 401 (gg-runner) — GitHub Actions self-hosted runner.
#
# Run from the Proxmox host (pve):
#   ssh root@192.168.1.200 -i ~/.ssh/id_ed25519_gastown
#   bash <(curl -s ...) --token <RUNNER_TOKEN>
#
# Or copy this script there and run:
#   bash provision-runner.sh --token <RUNNER_TOKEN>
#
# HUMAN STEP: Obtain the runner registration token from:
#   GitHub → kyle079/gastown-gui → Settings → Actions → Runners → New self-hosted runner
# Token is single-use and expires in 1 hour.

set -euo pipefail

VMID=401
NAME=gg-runner
IP=192.168.2.41
GW=192.168.2.1
TEMPLATE="local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst"
STORAGE=local-lvm
CORES=4
MEMORY=4096
DISK=20
VLAN=2
NODE_VERSION=20

RUNNER_TOKEN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --token) RUNNER_TOKEN="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$RUNNER_TOKEN" ]]; then
  echo "ERROR: --token <RUNNER_TOKEN> required"
  echo "Get it from: GitHub → kyle079/gastown-gui → Settings → Actions → Runners → New self-hosted runner"
  exit 1
fi

echo "=== Creating LXC $VMID ($NAME) ==="
pct create "$VMID" "$TEMPLATE" \
  --hostname "$NAME" \
  --cores "$CORES" \
  --memory "$MEMORY" \
  --rootfs "$STORAGE:$DISK" \
  --net0 "name=eth0,bridge=vmbr0,gw=$GW,ip=$IP/24,tag=$VLAN,type=veth" \
  --nameserver 192.168.2.200 \
  --searchdomain millr.xyz \
  --unprivileged 1 \
  --features "nesting=1" \
  --onboot 1 \
  --timezone "America/Indiana/Indianapolis"

pct start "$VMID"
echo "Waiting for container to boot..."
sleep 8

echo "=== Installing build toolchain ==="
pct exec "$VMID" -- bash -c "
  apt-get update -qq
  apt-get install -y --no-install-recommends \
    curl ca-certificates git rsync jq build-essential
  # Install Node LTS via NodeSource
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
  node --version && npm --version
"

echo "=== Creating runner user ==="
pct exec "$VMID" -- bash -c "
  useradd -m -s /bin/bash runner || true
  # Allow sudo for nginx reload on app host (not needed here, but good practice)
"

echo "=== Registering GitHub Actions runner ==="
pct exec "$VMID" -- bash -c "
  su - runner -c '
    mkdir -p ~/actions-runner && cd ~/actions-runner
    RUNNER_ARCH=x64
    RUNNER_VERSION=\$(curl -s https://api.github.com/repos/actions/runner/releases/latest | grep \"tag_name\" | cut -d\\\"v\\\" -f2 | cut -d\\\"\\\"\" -f1)
    curl -sLO https://github.com/actions/runner/releases/download/v\${RUNNER_VERSION}/actions-runner-linux-\${RUNNER_ARCH}-\${RUNNER_VERSION}.tar.gz
    tar xzf actions-runner-linux-\${RUNNER_ARCH}-\${RUNNER_VERSION}.tar.gz
    ./config.sh \
      --url https://github.com/kyle079/gastown-gui \
      --token \"$RUNNER_TOKEN\" \
      --name \"$NAME\" \
      --labels \"self-hosted,linux,gg-runner\" \
      --unattended \
      --replace
  '
  # Install as systemd service
  cd /home/runner/actions-runner && ./svc.sh install runner
  ./svc.sh start
  echo \"Runner service status:\"
  ./svc.sh status
"

echo "=== Done. Runner $NAME at $IP registered. ==="
echo "Verify at: https://github.com/kyle079/gastown-gui/settings/actions/runners"
