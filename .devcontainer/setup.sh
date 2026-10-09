#!/usr/bin/env bash
set -euo pipefail
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
if ! command -v bun >/dev/null 2>&1; then
  command -v unzip >/dev/null || { sudo apt-get update; sudo apt-get install -y unzip; }
  curl --fail --show-error --silent --location https://bun.sh/install | bash
fi
bun --version
bun install --frozen-lockfile
