#!/usr/bin/env bash
set -euo pipefail
admin_key="$HOME/.ssh/carter-admin"
admin_hosts="$HOME/.ssh/carter-admin-known-hosts"
admin_state="$HOME/.local/state/carter-admin"
if [ ! -s "$admin_key" ] || [ ! -s "$admin_hosts" ]; then exit 0; fi
mkdir -p "$admin_state"
chmod 600 "$admin_key" "$admin_hosts"
if [ "${1:-}" = --run ]; then
  exec 9>"$admin_state/tunnel.lock"
  flock -n 9 || exit 0
  while true; do
    ssh -N -T -o BatchMode=yes -o ExitOnForwardFailure=yes \
      -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
      -o StrictHostKeyChecking=yes -o IdentitiesOnly=yes \
      -o "UserKnownHostsFile=$admin_hosts" -i "$admin_key" \
      -L 127.0.0.1:8083:127.0.0.1:8083 \
      orbit-assets-tunnel@51.79.45.186 || true
    sleep 5
  done
else
  nohup setsid bash "$0" --run > "$admin_state/tunnel.log" 2>&1 < /dev/null &
fi
