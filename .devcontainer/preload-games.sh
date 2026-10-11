#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
mkdir -p .game-cache
# flock holds the lock for the entire job, including across lifecycle restarts.
# No duplicate preloader is created when a server is already running.
nohup setsid flock --nonblock .game-cache/preload.lock bash -c 'echo $$ > .devcontainer/games-cache.pid; exec bun run games:cache > .devcontainer/games-cache.log 2>&1' > /dev/null 2>&1 < /dev/null &
