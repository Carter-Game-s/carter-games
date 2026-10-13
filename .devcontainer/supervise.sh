#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
if [ -z "${CODESPACE_NAME:-}" ] && [ -f /workspaces/.codespaces/shared/environment-variables.json ]; then
  CODESPACE_NAME="$(node -e 'const fs=require("node:fs");const value=JSON.parse(fs.readFileSync("/workspaces/.codespaces/shared/environment-variables.json","utf8")).CODESPACE_NAME;console.log(typeof value==="string" && /^[a-z0-9-]+$/.test(value)?value:"")')"
  export CODESPACE_NAME
fi
if [ "${1:-}" != --run ]; then
  nohup setsid bash "$0" --run > .devcontainer/supervisor.log 2>&1 < /dev/null &
  exit 0
fi
exec 9>.devcontainer/supervisor.lock
flock -n 9 || exit 0
echo $$ > .devcontainer/supervisor.pid
app_pid=""
stop_app() {
  if [ -n "$app_pid" ]; then
    kill -TERM -- "-$app_pid" 2>/dev/null || true
    for attempt in {1..10}; do
      kill -0 "$app_pid" 2>/dev/null || break
      sleep 1
    done
    kill -KILL -- "-$app_pid" 2>/dev/null || true
    wait "$app_pid" 2>/dev/null || true
    app_pid=""
  fi
}
trap 'stop_app; exit 0' TERM INT HUP
trap 'stop_app' EXIT
if curl -fsS --max-time 5 http://127.0.0.1:3000/ >/dev/null; then
  previous=$(cat .devcontainer/server.pid 2>/dev/null || true)
  if [[ "$previous" =~ ^[0-9]+$ ]] &&
     [ "$(readlink "/proc/$previous/cwd" 2>/dev/null)" = "$PWD" ] &&
     [[ "$(ps -p "$previous" -o args=)" == 'bun run start'* ]] &&
     [ "$(ps -p "$previous" -o pgid= | tr -d ' ')" = "$previous" ]; then
    app_pid="$previous"
    stop_app
  else
    echo 'Port 3000 is already serving; refusing to replace an unmanaged app.'
    exit 1
  fi
fi
while true; do
  echo "$(date -u +%FT%TZ) Starting Carter Games"
  setsid bun run start >> .devcontainer/server.log 2>&1 9>&- &
  app_pid=$!
  echo "$app_pid" > .devcontainer/server.pid
  started=$SECONDS
  failures=0
  while kill -0 "$app_pid" 2>/dev/null; do
    sleep 30
    if (( SECONDS - started >= 2100 )); then
      echo "$(date -u +%FT%TZ) Scheduled 35-minute restart"
      break
    fi
    if curl -fsS --max-time 10 http://127.0.0.1:3000/ >/dev/null; then
      failures=0
    else
      failures=$((failures + 1))
      if (( failures >= 3 )); then
        echo "$(date -u +%FT%TZ) Restarting after failed health checks"
        break
      fi
    fi
  done
  stop_app
  sleep 5
done
