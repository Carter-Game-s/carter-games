#!/usr/bin/env bash
set -euo pipefail
admin_host="${ADMIN_VPS_HOST:-${GAME_ASSET_VPS_HOST:-}}"
if [ -z "$admin_host" ] && [ -f .env.local ]; then
  admin_host="$(node -e 'const fs=require("node:fs");const text=fs.readFileSync(".env.local","utf8");const match=text.match(/^(?:ADMIN_VPS_HOST|GAME_ASSET_VPS_HOST)=(.*)$/m);console.log(match?match[1].trim().replace(/^["\x27]|["\x27]$/g, ""):"")')"
fi
if [ -z "$admin_host" ]; then exit 0; fi
if [[ ! "$admin_host" =~ ^[a-zA-Z0-9.-]+$ ]]; then exit 1; fi
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
      "orbit-assets-tunnel@$admin_host" || true
    sleep 5
  done
else
  nohup setsid bash "$0" --run > "$admin_state/tunnel.log" 2>&1 < /dev/null &
fi
