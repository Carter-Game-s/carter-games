#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
bash .devcontainer/start-chat.sh
bash .devcontainer/start-proxy.sh
nohup setsid bun .devcontainer/assets-tunnel.ts > .devcontainer/assets-tunnel.log 2>&1 < /dev/null &
echo $! > .devcontainer/assets-tunnel.pid
