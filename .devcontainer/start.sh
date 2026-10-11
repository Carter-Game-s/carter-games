#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.bun/bin:$PATH"
if ! command -v bun >/dev/null 2>&1 || [ ! -d node_modules ]; then bash .devcontainer/setup.sh; fi
bash .devcontainer/start-assets-tunnel.sh
# A restart with an already-listening server must not spawn a second process.
if node -e "require('net').connect(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"; then exit 0; fi
# A separate session survives closure of the Codespaces lifecycle/SSH shell.
nohup setsid bun run dev --hostname 0.0.0.0 > .devcontainer/server.log 2>&1 < /dev/null &
echo $! > .devcontainer/server.pid
