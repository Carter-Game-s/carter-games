# Production repair — 2026-10-15

Verification completed at 04:43 UTC.

Public website: https://survivors-gui-says-dinner.trycloudflare.com

Final HTTP checks: local 200, public 200, tunnel readiness 200. Website and
tunnel PM2 restart counts: zero since deployment. Ollama and asset preloader
systemd restart counts: zero. Unrelated PM2 statuses and PIDs remain unchanged.

## Causes and repairs

- PM2 and a detached `.devcontainer/supervise.sh --run` were competing for
  port 3000. Historical logs contained repeated EADDRINUSE failures, and the
  PM2 website had accumulated 706 restarts. Stopped the detached supervisor
  and deployed the website as one foreground Next.js process under PM2.
- `orbit-assets-tunnel` supervised a launcher that detaches children and exits.
  It reached PM2's restart limit. The remote integration has no host or credentials
  configured, so this optional launcher was removed from PM2 to prevent restart on reboot.
- Ollama was installed and running outside a persistent supervisor. Its default
  six-thread worker stalled under host load. Moved it to systemd, limited CPU
  affinity to two CPUs, and stored `num_thread=2` in the existing model parameters.
  Model weights were reused; no additional large model was downloaded.
- `/api/chat` previously advertised configuration as availability. It now checks
  provider model discovery with a bounded timeout and confirms the selected model.
- The browser page defaulted to a visitor's `localhost:3001`, which cannot reach
  this VPS. An absent engine URL now selects the existing same-origin browser.
  Explicitly configured engines and the existing optional interactive service
  remain supported.
- Native-game browser tests now advance animation time explicitly. On this busy
  host, real rounds could end while automation was moving to Pause, causing a
  disabled-control wait. Game behavior and test assertions are preserved.
- A live proxy browser test expected an upstream heading that example.com no
  longer sends. Updated it to assert the preserved explanatory paragraph.
- The existing asset preloader's dashboard listened on all interfaces. Changed
  its dashboard binding to localhost. Its authenticated asset service and admin
  interface also listen on localhost.

## Configuration and deployment

`.env.local` was backed up before editing and is owner-only. The selected model is
`CHAT_MODEL=qwen2.5:0.5b`, with `CHAT_BASE_URL=http://127.0.0.1:11434/v1`.
Proxy limits are 5,000,000 bytes, 10,000 ms, and 120 requests/minute. Optional
asset settings remain empty. No optional hostnames or credentials were invented.
Backups are outside Git in `/root/carter-deployment-backup` with restricted access.

A first build command inadvertently ran in the live directory and removed its
build files before it was stopped; the existing process continued answering HTTP.
The replacement production build was completed in `/root/carter-build`, checked
on localhost:3002, then copied into the project during a targeted PM2 cutover.
The temporary test server was stopped afterward.

| Service | Supervisor | Verified state |
| --- | --- | --- |
| orbit-proxy-games | PM2 | online; localhost:3000 |
| cloudflare-tunnel | PM2 | online; original process preserved |
| orbit-assets-tunnel | disabled | removed from PM2; unconfigured optional integration |
| carter-ollama | systemd | active; localhost:11434 |
| orbit-games-preloader | systemd | active; localhost-only asset/admin/dashboard |

PM2's verified process list was saved. `pm2-root`, `carter-ollama`, and the existing
asset preloader are enabled at boot. The PM2 dump and configuration backups have
owner-only permissions. Reboot recovery configuration was inspected; no reboot
was performed. Unrelated PM2 application statuses and PIDs were compared with the
pre-repair snapshot and preserved.

## Verification

- Production build, its TypeScript validation, initial standalone typecheck,
  repository lint, changed-file lint, game contract validation: passed.
  Final standalone typecheck after all test changes also passed.
- 118 unit tests have passing results. Two original tests exceeded the default
  five-second timeout during concurrent build/load; both passed with a 30-second
  test allowance. No test assertions were removed.
- Ollama native generation and OpenAI-compatible generation: real text returned.
- Deployed chat discovery, buffered generation, and streamed generation: passed.
- Public Chromium AI chat: rendered a generated `OK` reply with no page errors.
- All 12 desktop/mobile browser checks have passing results across retests:
  navigation, private-address rejection, all seven native games and overflow,
  external sandboxed gameplay, favorites/settings, and the live public proxy.
  On the loaded VPS the verification harness used extended test/assertion
  allowances. The stale upstream-heading assertion and game-clock race were
  repaired; all original game assertions remain.
- Local and Cloudflare website HTTP: 200. Tunnel readiness: 200.
- Public-site proxy: rendered Example Domain. Private IPv4, loopback, IPv6 loopback,
  numeric loopback and cloud metadata requests were rejected. Existing security
  tests cover DNS pinning, redirects, limits, and credential/header boundaries.
- `.env`, `.env.local`, local Ollama paths and private admin routes are unavailable
  through the public application routing.
- Existing asset cache completed verification: 353/353 ready, zero failures.
- Existing authenticated asset backend: real game downloaded and pinned Git hash
  verified after gzip decoding. Website pack-2048 asset route: HTTP 200 with HTML.
- Soundboard audio: real MP3 bytes, HTTP 206 two-byte media range, and actual
  Chromium audio playback succeeded.

## Limits

The Quick Tunnel hostname can change when cloudflared restarts. A stable hostname
requires a Cloudflare account-managed named tunnel and domain. The optional remote
asset tunnel and interactive browser integration are not configured. The existing
fallbacks remain available. All game manifests were validated; individual gameplay
for every imported game has not been exhaustively tested. Reboot survival is
configuration-verified rather than reboot-tested.

The VPS has six CPUs, approximately 15 GiB RAM, no swap and about 21 GiB free disk.
Unrelated workloads were also consuming substantial CPU. They were not modified.
Repository edits that existed before this task were preserved. No commit or push
was made during the repair itself; publishing requires separate authorization.
No secrets or model files were added to Git.
