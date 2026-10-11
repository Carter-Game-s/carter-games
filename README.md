# Orbit · Proxy & Games

A complete Next.js 16 / React 19 / strict TypeScript application with Tailwind CSS, Lucide icons, Bun, a guarded read-only web proxy, API-free search, seven native games, Color Tap, and 352 imported single-file games with individual SVG logos. No account, database, or paid API is required. Settings, favorites, recent searches, browsing history, 2048 saves, and high scores are stored on the current device.

## Run locally

Install [Bun](https://bun.sh/docs/installation) and Node.js 22 or later, then run from this folder:

```bash
bun install --frozen-lockfile
bun run dev --hostname 0.0.0.0
```

Open http://localhost:3000. `bun run dev` generates registries before starting Next.js, even on Bun versions that do not run predev automatically. Restart the server after adding games, or run `bun run games:generate` manually and refresh the page.

Production:

```bash
bun run build
bun run start
```

## GitHub Codespaces

1. Upload the contents of this folder to a GitHub repository, including `.devcontainer`, `bun.lock`, `src`, `public`, and `tools`.
2. On GitHub choose **Code → Codespaces → Create codespace on main**.
3. Container creation installs Bun through `ghcr.io/shyim/devcontainers-features/bun:0`, then `.devcontainer/setup.sh` installs dependencies from the lockfile. The setup script also provides an idempotent official Bun installer fallback if Bun is absent.
4. `.devcontainer/start.sh` starts Next.js in the background on `0.0.0.0:3000`, returning promptly so the Codespace can finish opening. On restart it reuses installed dependencies and avoids a second server if port 3000 already listens.
5. The **Ports** panel automatically forwards 3000. Click its **Open in Browser** globe icon if the browser does not open automatically. Use the `https://<codespace>-3000.app.github.dev` forwarded address, not the localhost address on your phone.
   Next.js automatically permits development assets from the current Codespace’s forwarded hostname via `CODESPACE_NAME` and `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`. Development and production use Webpack for consistent behavior.
   The proxy also uses these trusted variables to validate the browser's HTTPS origin, including GitHub's matching-origin rewrite to local HTTP or HTTPS. When launching through SSH, which may omit Codespaces metadata, explicitly export them before running `bun run start`: `CODESPACE_NAME` must be the actual Codespace name and `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN` is normally `app.github.dev`. Production must inherit these variables; setting them only for the build is insufficient. Keep any local environment file uncommitted.

6. Keep port visibility **Private**. GitHub's access control protects your development workspace. The application itself has no login.

Startup logs: `.devcontainer/server.log`. To restart after source or registry changes, stop the process named in `.devcontainer/server.pid` and run `bash .devcontainer/start.sh`, or run `bun run dev --hostname 0.0.0.0` in a terminal after stopping the previous server. Do not run two servers on port 3000.

The Bun OCI feature manifest for tag `0` was checked successfully during development. Automated configuration tests verify the feature reference, startup command, and forwarded port. Creating an actual fresh GitHub Codespace must be verified in your GitHub account; local tests do not claim to provision one.

## Browse & search

The homepage accepts either a search or a direct HTTP(S) URL. Bing is the default because its HTML results work through the read-only proxy. Google and DuckDuckGo remain selectable; DuckDuckGo uses its non-JavaScript HTML endpoint. Existing Google or DuckDuckGo searches offer **Search with Bing**, preserving the query when a provider requires scripts, redirects to an unavailable host, or presents a challenge. Search uses ordinary URLs with no API credentials. Recent searches provide local suggestions. Press **Ctrl/⌘ K** to focus search; **Ctrl/⌘ L** focuses the browser address bar.

The browser supports independent tabs, per-tab back/forward stacks, refresh, a home control, loading feedback, errors, and recent browsing history. In-page links update the application's browser stack. Use **Open directly** (the external-link icon) whenever a provider or website does not work through the proxy. Back and forward operate the browser tab's content history; application route navigation remains Next.js navigation.

### Proxy support and limits

This is a real server-side **read-only HTTP(S) proxy**, not a VPN, full browser engine, or security bypass. It fetches supported public HTML, CSS, images, and fonts; rewrites links, assets, styles, and srcsets; and follows up to five validated redirects. Site scripts, nested frames, form submissions, media APIs, WebSockets, authentication, and cookies are not supported. Modern JavaScript applications, CAPTCHAs, anti-bot systems, and login-dependent pages may not render correctly. Website HTTP errors are shown rather than circumvented. Remote content is isolated in an opaque-origin iframe.

Public HTTP(S) websites on standard ports are enabled by default, including their public redirect and asset hosts. Private, loopback, link-local, metadata, and unsafe DNS destinations remain blocked on every request and redirect. Set `PROXY_ALLOWED_HOSTS` to a comma-separated exact-host list if you want to restrict access; leave it empty for public-web access.

Safeguards include:

- HTTP(S) and standard ports only; URL credentials and private, loopback, link-local, multicast, reserved, and metadata addresses are blocked.
- Every DNS answer is checked and each connection pins a checked address, retaining the proper Host header and TLS verification. Every redirect is validated again.
- A 10-second overall request deadline, 5 MB streaming and declared response limits, at most five redirects, and in-memory rate limits. Environment overrides are bounded to 20 seconds and 10 MB.
- A same-origin POST issues a short-lived HMAC capability. Upstream page and asset requests require it. Cross-origin browser issuance is rejected. Tokens expire after 15 minutes and refresh while the browser is open.
- Upstream requests contain a fixed anonymous User-Agent and Accept headers, never user cookies, Authorization, incoming headers, or credentials. Upstream Set-Cookie is not returned.
- CSP, `nosniff`, no-referrer, disabled forms, and sandboxing isolate rewritten content. Only the application-owned link-navigation script runs.

Rate counters and capabilities are scoped to a single server process, matching Codespaces. Do not scale this implementation to multiple public instances without centralized budgets and a shared signing secret. A public origin can be called by non-browser clients; same-origin checks are not authentication. Keep the Codespaces port private. An optional exact-host allowlist can further restrict destinations.

## Games

Native games: **Snake, 2048, Pong, Breakout, Minesweeper, Tic-Tac-Toe, Sky Hop** (Flappy Bird-inspired). Touch controls and keyboard instructions are visible on each game route. Canvas games offer pause, restart, and touch buttons; Pong and Breakout also support dragging. 2048 supports swipes and saves its board. Minesweeper's first reveal is safe; flag mode and right-click are supported. Tic-Tac-Toe has a computer opponent and a two-player mode. Fullscreen uses a user-initiated control and shows an explanatory message on browsers without the Fullscreen API.

The playable **Color Tap** HTML5 example demonstrates external discovery. It runs with exactly `sandbox="allow-scripts"`, cannot read parent storage, cookies, or DOM, and uses only assets in its own folder. Its internal progress is session-only because an opaque-origin sandbox cannot use the parent application's storage. Favorites and recently played are still saved by the parent.

The library derives cards, search, categories, featured games, favorites, and recently played from one unified generated registry. Native components are loaded only by their registry `load()` function when their detail route renders. Failed imports have a retry action. See [GAME_DEVELOPMENT.md](GAME_DEVELOPMENT.md) for the full plugin contract.

## Settings

Choose the default search provider, dark/light/system theme, homepage recent-search and quick-link preferences, and reduced interface motion. Clear search history, browsing history, or game saves/high scores separately. Clearing game progress preserves favorites. Reduced motion removes decorative transitions and loading animations; gameplay movement remains necessary for arcade games.

## Validation

```bash
bun install --frozen-lockfile
bun run games:generate
bun run typecheck
bun run lint
bun run test
bun run build
```

The unit/component acceptance suite covers recursive native discovery, external discovery, deterministic generation, unified registry inclusion, cross-kind duplicates, invalid metadata, partial directories, safe sandboxing, loading states, failed-import retry, player selection, all seven game runtime contracts, real game logic, timer/listener cleanup, proxy guards, redirect validation, DNS pinning, timeouts, size limits, and Codespaces configuration.

Browser integration tests run at desktop and mobile viewport sizes:

```bash
bunx playwright install --with-deps chromium
bun run test:e2e
```

These tests open home, submit searches, navigate direct URLs, reject private addresses, start all seven games using visible controls, play Color Tap inside its sandbox, save favorites, switch themes, and verify unknown game routes. The separate live example.com assertion requires an outbound public network connection: run `LIVE_PROXY_TEST=1 bun run test:e2e` to enable it. Without that flag it is explicitly skipped, while proxy transport and rewriting are covered by deterministic unit tests. Browser binary installation also requires internet access. Real mobile device testing and actual Codespaces creation are separate checks; viewport tests do not claim to emulate every device or GitHub provisioning.

## Architecture

- `src/app`: App Router pages and the Node.js proxy Route Handler.
- `src/components`: browser, layout, game cards, lazy loader, and external player.
- `src/games`: plugin types, metadata, playable components, shared pure game logic, and generated registries.
- `src/lib`: search normalization, registry-based filtering, local storage, and proxy security/fetch/rewriting.
- `src/proxy.ts`: restrictive content policy for external-game documents and assets.
- `tools`: static metadata parser, discovery, validation, and generation.
- `tests`, `e2e`: automated acceptance coverage.

Generated registries are committed for editor/typechecking convenience and always regenerated before development and builds. No browser filesystem scanning occurs.

## Imported Offline HTML Games Pack

All 352 games from [carteraccs/Offline-HTML-Games-Pack](https://github.com/carteraccs/Offline-HTML-Games-Pack) are inventoried at commit `d52fe447483251e486a2de49132c8240f8369706`. The library contains 360 games total (seven native, Color Tap, and 352 imported). Each imported game has its own title, genre, SVG logo, sandboxed player, and immutable source blob hash. `bun run games:import` regenerates the imported metadata and logos from the checked-in inventory.

The pack is several gigabytes. Its original HTML files download from the pinned public repository on first play, pass a Git blob integrity check, and are gzip-cached in ignored `.game-cache/`. Game binaries and generated runtime caches are not duplicated into this application repository. First play requires outbound GitHub access; cached games work without another upstream download. Downloads are bounded, deduplicated, and limited to four concurrent games.

To pre-cache every game, run `bun run games:cache`. If you already have the pinned pack's offline directory, run `bun run games:cache /absolute/path/to/offline` to verify and cache local files. Cache files survive application rebuilds.

Imported games retain an opaque sandbox without `allow-same-origin` or navigation permissions. Their CSP permits embedded data/blob assets, WebAssembly, and workers, while blocking external network requests, forms, camera, microphone, and geolocation. A bounded storage bridge saves localStorage values only under that game's own application key; the original game's scripts cannot read application storage. Games that require unavailable browser APIs, external servers, or broken upstream assets can still fail; the catalog and integrity checks do not claim exhaustive gameplay verification.
