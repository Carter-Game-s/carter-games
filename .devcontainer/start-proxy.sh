#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if curl -fsS --max-time 2 http://127.0.0.1:3001/health >/dev/null; then exit 0; fi
if [ ! -d infra/proxy/node_modules ]; then bun install --cwd infra/proxy --frozen-lockfile; fi
nohup setsid node infra/proxy/server.mjs > .devcontainer/browser-engine.log 2>&1 < /dev/null &
echo $! > .devcontainer/browser-engine.pid
