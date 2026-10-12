#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
if ! command -v bun >/dev/null 2>&1 || [ ! -d node_modules ]; then bash .devcontainer/setup.sh; fi
bash .devcontainer/start-assets-tunnel.sh
if node -e "require('net').connect(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"; then exit 0; fi
if [ ! -f .next/BUILD_ID ]; then bun run build; fi
nohup setsid bun run start > .devcontainer/server.log 2>&1 < /dev/null &
echo $! > .devcontainer/server.pid
