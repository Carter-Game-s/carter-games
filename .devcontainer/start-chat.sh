#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${CHAT_BASE_URL:-}" != "http://127.0.0.1:11434/v1" ]; then exit 0; fi
carter_chat_runtime="$HOME/.local/share/carter-chat/runtime"
if [ ! -x "$carter_chat_runtime/bin/ollama" ]; then exit 0; fi
if curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null; then exit 0; fi
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_MODELS="$HOME/.local/share/carter-chat/models"
export OLLAMA_NO_CLOUD=1
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_CONTEXT_LENGTH=4096
nohup setsid "$carter_chat_runtime/bin/ollama" serve > .devcontainer/chat.log 2>&1 < /dev/null &
echo $! > .devcontainer/chat.pid
