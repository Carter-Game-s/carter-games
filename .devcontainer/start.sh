#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
if ! command -v bun >/dev/null 2>&1 || [ ! -d node_modules ]; then bash .devcontainer/setup.sh; fi
if [ ! -f .next/BUILD_ID ]; then bun run build; fi
bash .devcontainer/supervise.sh
