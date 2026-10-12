#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
carter_chat_home="$HOME/.local/share/carter-chat"
mkdir -p "$carter_chat_home/runtime" "$carter_chat_home/models"
if [ ! -x "$carter_chat_home/runtime/bin/ollama" ]; then
  curl -fL --retry 2 https://ollama.com/download/ollama-linux-amd64.tar.zst -o "$carter_chat_home/ollama.tar.zst"
  tar --zstd -xf "$carter_chat_home/ollama.tar.zst" -C "$carter_chat_home/runtime" bin lib/ollama
fi
export CHAT_BASE_URL=http://127.0.0.1:11434/v1
bash .devcontainer/start-chat.sh
for carter_chat_attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null; then break; fi
  sleep 1
done
export OLLAMA_HOST=127.0.0.1:11434
"$carter_chat_home/runtime/bin/ollama" pull qwen2.5:0.5b
