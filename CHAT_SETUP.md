Carter AI supports either an OpenAI-compatible local model server or Vercel AI Gateway.

For chat inside a Codespace, install `zstd`, run `bash .devcontainer/setup-chat.sh`, and set `CHAT_BASE_URL=http://127.0.0.1:11434/v1` and `CHAT_MODEL=qwen2.5:0.5b` in `.env.local`. Models and the runtime live outside the repository. The application startup script automatically starts the model server on loopback when this configuration is present.

For a local model, set these server environment variables:

```
CHAT_BASE_URL=http://127.0.0.1:18083/v1
CHAT_MODEL=qwen2.5:0.5b
```

Keep the model server private and connect through an authenticated SSH tunnel. Set `CHAT_API_KEY` if your model server requires authentication.

For hosted chat, add `AI_GATEWAY_API_KEY` to Codespaces secrets and set `CHAT_MODEL` to an available AI Gateway model. The default is `openai/gpt-5.4-nano`. Rebuild and restart after provisioning the secret. Never put keys in client code or commit `.env.local`.

The chat accepts plain text, streams responses, supports cancellation, and keeps history only in the current browser tab. Requests require the same application origin and have size and rate limits. Models have no browsing or execution tools.
