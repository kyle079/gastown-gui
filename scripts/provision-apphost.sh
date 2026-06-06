#!/usr/bin/env bash
# Provision LXC 402 (gg-app) — nginx app host for gastown-gui static frontend.
#
# Run from the Proxmox host (pve, ssh root@192.168.1.200):
#   bash provision-apphost.sh [--pubkey "ssh-ed25519 AAAA..."]
#
# After provisioning:
#   1. Add DEPLOY_KEY secret to GitHub (private key matching --pubkey)
#   2. Add APP_HOST=192.168.2.42 secret to GitHub
#   3. Add APP_HOST_USER=ubuntu secret to GitHub
# Then trigger a CD run or push a commit to master.

set -euo pipefail

VMID=402
NAME=gg-app
IP=192.168.2.42
BRIDGE_IP=192.168.2.40   # LXC 400 (gastown) where the bridge runs
BRIDGE_PORT=7667
GW=192.168.2.1
TEMPLATE="local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst"
STORAGE=local-lvm
CORES=1
MEMORY=512
DISK=8
VLAN=2

DEPLOY_PUBKEY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pubkey) DEPLOY_PUBKEY="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

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
  --onboot 1 \
  --timezone "America/Indiana/Indianapolis"

pct start "$VMID"
echo "Waiting for container to boot..."
sleep 8

echo "=== Installing nginx ==="
pct exec "$VMID" -- bash -c "
  apt-get update -qq
  apt-get install -y --no-install-recommends nginx
  mkdir -p /var/www/gastown
  chown -R www-data:www-data /var/www/gastown
"

echo "=== Writing nginx config ==="
pct exec "$VMID" -- bash -c "cat > /etc/nginx/sites-available/gastown <<'NGINX'
server {
    listen 80;
    server_name _;

    root /var/www/gastown;
    index index.html;

    # Serve static Vite build; fall back to index.html for SPA routing.
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy REST API to the bridge on LXC 400.
    location /api/ {
        proxy_pass http://${BRIDGE_IP}:${BRIDGE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Proxy WebSocket to the bridge.
    location /ws {
        proxy_pass http://${BRIDGE_IP}:${BRIDGE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_read_timeout 3600;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/gastown /etc/nginx/sites-enabled/gastown
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo 'nginx configured'
"

echo "=== Creating deploy user ==="
pct exec "$VMID" -- bash -c "
  useradd -m -s /bin/bash ubuntu || true
  mkdir -p /home/ubuntu/.ssh
  chmod 700 /home/ubuntu/.ssh
  # Allow ubuntu user to reload nginx without a password
  echo 'ubuntu ALL=(ALL) NOPASSWD: /usr/bin/nginx, /bin/systemctl reload nginx, /bin/systemctl status nginx' \
    > /etc/sudoers.d/ubuntu-nginx
  chmod 440 /etc/sudoers.d/ubuntu-nginx
  # Allow write to web root
  chown ubuntu:www-data /var/www/gastown
  chmod 775 /var/www/gastown
"

if [[ -n "$DEPLOY_PUBKEY" ]]; then
  echo "=== Installing deploy SSH public key ==="
  pct exec "$VMID" -- bash -c "
    echo '$DEPLOY_PUBKEY' >> /home/ubuntu/.ssh/authorized_keys
    chmod 600 /home/ubuntu/.ssh/authorized_keys
    chown -R ubuntu:ubuntu /home/ubuntu/.ssh
  "
  echo "Deploy key installed."
else
  echo "NOTICE: No --pubkey provided. Manually add the deploy public key:"
  echo "  pct exec $VMID -- bash -c \"echo 'YOUR_PUBKEY' >> /home/ubuntu/.ssh/authorized_keys\""
fi

echo "=== Done. App host $NAME at $IP ready. ==="
echo ""
echo "Next steps:"
echo "  1. Add GitHub secret DEPLOY_KEY (private key) to kyle079/gastown-gui"
echo "  2. Add GitHub secret APP_HOST=$IP"
echo "  3. Add GitHub secret APP_HOST_USER=ubuntu"
echo "  4. Ensure LXC 400 bridge listens on $BRIDGE_IP:$BRIDGE_PORT (HOST=0.0.0.0)"
echo "  5. Push a commit to master to trigger first deploy"
