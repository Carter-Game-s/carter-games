# Carter Games

Browser games, a soundboard, AI chat, and an experimental web browser, created by **Carter (carteraccs)** with **AI assistance from OpenAI Codex**. Carter directed the project; Codex helped with implementation, debugging, testing, documentation, and deployment. Imported games remain credited to their original creators.

## Features

- Seven built-in games: Snake, 2048, Pong, Breakout, Minesweeper, Tic-Tac-Toe, and Sky Hop.
- An imported HTML game library with generated cards and logos, search, favorites, and recently played games.
- A soundboard with upstream catalog search, categories, pagination, favorites, volume, and stop controls. Audio streams from its source.
- Streaming AI chat with a configured local OpenAI-compatible model server or AI Gateway.
- An isolated Scramjet browser service with tabs, navigation controls, and public-destination validation.
- Game publishing tools and optional automatic synchronization with Carter's private VPS preloader.
- Device-local settings, browsing history, saved game progress, and high scores.

The app uses Next.js, React, TypeScript, and Bun. The game library and soundboard do not require an AI provider; chat requires its own model configuration.

## Run locally

Install Bun and Node.js 22 or later, then run:

```bash
bun install --frozen-lockfile
bun run games:generate
bun install --cwd infra/proxy --frozen-lockfile
bash .devcontainer/start-proxy.sh
bun run dev --hostname 0.0.0.0
```

Open `http://localhost:3000`. The browser engine listens on port 3001. Keep local environment settings in an uncommitted `.env.local`; use `.env.example` as a configuration reference.

For a production build:

```bash
bun run build
bun run start
```

The startup scripts start configured auxiliary services. Game caches, model files, logs, secrets, and dependency directories stay outside Git.

## Codespaces

Create a Codespace from this repository. The included `.devcontainer` configuration installs dependencies and starts the application. Use the forwarded port 3000 link from the Ports panel. Port 3001 serves the isolated browser engine; the optional preloader admin tunnel uses private port 8083.

Repository visibility and forwarded-port visibility are separate. Keep development and administration access private unless you deliberately configure another exposure. When starting the app through SSH, preserve the actual `CODESPACE_NAME` and forwarding-domain metadata. Startup logs are written to ignored `.devcontainer/*.log` files.

## Games and publishing

Native games and external games share a generated registry. Run `bun run games:generate` after changing game metadata. See [GAME_DEVELOPMENT.md](GAME_DEVELOPMENT.md) for the plugin contract.

Publish an original self-contained HTML game:

```bash
bun run games:publish ./my-game.html --title "My Game" --category arcade
```

Commit and push the generated assets, metadata, manifest, and registry together. See [PUBLISHING.md](PUBLISHING.md) for updates, supported sizes, and chunked assets.

Imported games use pinned source revisions and Git blob integrity checks. Their runtime cache lives in ignored `.game-cache/`; the app does not bulk-preload the entire library at startup. First play can require an upstream download. An optional authenticated cache service supplies pre-cached versions without changing browser gameplay.

Carter's production preloader remains private. The public [preloader guide](https://github.com/carteraccs/carter-games-preloader-guide) explains how to build a separate service, including verified caching, automatic discovery, secure administration, and deployment.

## Soundboard and AI chat

The soundboard queries Sound Buttons World for catalog metadata and uses its public audio URLs for playback. Source links and credits remain visible; audio files are not copied into this repository. Availability depends on the upstream service.

See [CHAT_SETUP.md](CHAT_SETUP.md) for a local model server or hosted AI configuration. Provider credentials stay server-side. Chat history lasts for the current browser tab; models have no browsing or execution tools.

## Browser status and security

The new Scramjet engine is experimental. The interface and transport integration are present, but HTTPS transport and complete third-party website compatibility are not yet verified. Sites can require authentication, reject proxies, or use unsupported browser APIs. Use the direct-open control when necessary.

The browser service runs on a separate origin. Its transport accepts HTTP(S) destinations on standard ports, validates every DNS answer, pins public addresses, and rejects private, loopback, link-local, and metadata destinations. Connection and stream limits remain enabled. Legacy read-only proxy endpoints also retain their origin, capability, response-size, timeout, and redirect checks.

Third-party games run in isolated players. Imported scripts do not receive application credentials or unrestricted access to parent storage. Keep service tokens, SSH keys, model-provider keys, and generated admin passwords out of client code and Git.

## Checks

```bash
bun install --frozen-lockfile
bun run games:generate
bun run typecheck
bun run lint
bun run test
bun run build
node --test infra/proxy/policy.test.mjs
```

Browser tests use Playwright:

```bash
bunx playwright install --with-deps chromium
bun run test:e2e
```

Live upstream checks require outbound connectivity; see the test configuration for optional network-dependent checks. Passing unit tests does not establish compatibility with every imported game or website.

## Contributing and licensing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Original application code is [MIT licensed](LICENSE). The isolated browser service has its own [AGPL-3.0 license](infra/proxy/LICENSE), and dependencies and imported assets retain their own licenses and attribution. See [THIRD_PARTY.md](THIRD_PARTY.md). Public source availability does not grant rights to redistribute third-party games or sounds.
