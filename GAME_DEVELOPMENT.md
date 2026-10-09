# Adding games

## Native directory contract

Every native game owns a directory anywhere under `src/games` containing **both** `metadata.ts` and `game.tsx`. Nested directories are supported. Shared helpers may live in directories containing neither file. A directory with only one required file fails generation. Files such as `types.ts`, `registry.ts`, generated files, and test modules are not discovered as games. Dedicated `__tests__` and `__fixtures__` directories are ignored.

```text
src/games/my-directory/
├── metadata.ts
└── game.tsx
public/games/my-directory/
└── thumbnail.svg
```

The directory name is independent of the public slug. The slug is declared in metadata, must match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, and is unique across both native and external games.

## Exact exported contracts

`src/games/types.ts` is the authoritative contract:

```tsx
import type React from "react";
export type GameKind = "native" | "external";
export type GameCategory =
  "arcade" | "puzzle" | "board" | "sports" | "action" | "other";
export type GameControl = {
  label: string;
  keys?: string[];
  description: string;
};
export type GameMetadata = {
  kind: "native";
  slug: string;
  title: string;
  description: string;
  category: GameCategory;
  thumbnail: string;
  featured?: boolean;
  tags?: string[];
  controls?: GameControl[];
  supportsTouch: boolean;
  supportsKeyboard: boolean;
  supportsFullscreen: boolean;
  scoreLabel?: string;
  version: string;
};
export type GameStorage = {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
};
export type GameRuntime = {
  storage: GameStorage;
  reportScore: (score: number) => void;
  setStatus: (status: "idle" | "playing" | "paused" | "won" | "lost") => void;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
};
export type NativeGameProps = {
  metadata: GameMetadata;
  runtime: GameRuntime;
  className?: string;
};
export type NativeGameComponent = React.ComponentType<NativeGameProps>;
export type NativeGameDefinition = {
  metadata: GameMetadata;
  load: () => Promise<{ default: NativeGameComponent }>;
};
export type ExternalGameMetadata = Omit<GameMetadata, "kind" | "scoreLabel"> & {
  kind: "external";
  sourcePath: string;
  sandbox: string;
};
export type ExternalGameDefinition = { metadata: ExternalGameMetadata };
export type GameDefinition = NativeGameDefinition | ExternalGameDefinition;
```

A component must export a default value with `NativeGameProps`; do not import library pages, route parameters, or registry internals. Components using hooks, canvas, events, timers, or browser APIs must begin with `"use client"`.

## Metadata and thumbnails

```ts
import type { GameMetadata } from "../types";
const metadata = {
  kind: "native",
  slug: "my-game",
  title: "My Game",
  description: "A complete playable game.",
  category: "arcade",
  thumbnail: "/games/my-directory/thumbnail.svg",
  featured: false,
  tags: ["classic"],
  controls: [
    {
      label: "Move",
      keys: ["Arrow keys"],
      description: "Move the player using arrows or the touch controls.",
    },
  ],
  supportsTouch: true,
  supportsKeyboard: true,
  supportsFullscreen: true,
  scoreLabel: "Score",
  version: "1.0.0",
} satisfies GameMetadata;
export default metadata;
```

Use a static object literal. The generator parses TypeScript syntax; it never imports metadata or executes game modules. Calls, spreads, computed expressions, and imported metadata values are rejected. You may export a literal directly or use a local literal variable with `satisfies GameMetadata`.

Required validation:

- Title: non-empty after trimming, at most 80 characters. Description: non-empty, at most 300.
- Category: `arcade`, `puzzle`, `board`, `sports`, `action`, or `other`.
- Thumbnail: existing file under `public`, referenced by an absolute `/...` path, without traversal, protocol-relative URLs, query strings, fragments, encoded traversal, or backslashes.
- Version: a semantic version, including valid prerelease/build forms.
- Touch, keyboard, and fullscreen capability flags: explicit booleans.
- Controls: non-empty labels/descriptions and, when present, an array of non-empty key names.
- Optional tags: non-empty string array. Optional featured flag: boolean.
- Unknown fields are rejected to catch misspellings.

Thumbnails can be SVG, PNG, WebP, or another browser-supported image. SVG covers for the included games are local vector artwork.

## Implementing a playable game

Implement the actual rules, interaction, win/loss conditions, restart, and state display. The included seven games are complete reference implementations. The shared arcade engine handles animation for Snake, Pong, Breakout, and Sky Hop, while their independent plugin modules remain the only lazy-loading entrypoints. 2048, Minesweeper, and Tic-Tac-Toe demonstrate grid games and pure, independently tested logic.

Use these runtime methods:

```tsx
runtime.reportScore(nextScore);
runtime.setStatus("playing");
runtime.storage.set("save", {/* serializable game-specific state */});
const save = runtime.storage.get("save", null);
```

Scores must be finite and non-negative. The runtime maintains high scores and namespaces storage by slug. Never call localStorage inside a game. The parent runtime has a stable identity while a game is mounted, so its methods can be dependencies of effects. The parent records a game as recently played only after its slug resolves to a known registry definition.

Declare capabilities honestly. Supply touch buttons, pointer/swipe controls, keyboard events, and visible instructions as appropriate. Give every button and canvas an accessible label; expose textual status outside canvas. Keyboard grid games should support arrow focus navigation and normal Enter activation. Native score/status reporting must occur on meaningful transitions. The runtime exposes fullscreen methods; the parent also supplies a fullscreen button.

Register listeners and start animation loops in effects. Return cleanup that removes the exact listener functions and cancels every timer/animation frame. Handle blur and pause for realtime games. Avoid hooks in conditional branches. Test gameplay rather than mounting a placeholder.

## Generation and unified registry

```bash
bun run games:generate
bun run validate:games
```

`tools/generate-game-registry.ts` recursively scans native directories and immediate external directories. It validates metadata and cross-kind uniqueness before writing either registry. Generated output is sorted by slug and written only when its bytes change. The header warns that manual edits are overwritten.

Native entries contain copied metadata and `load: () => import("./my-directory/game")`. External entries contain metadata only. `registry.ts` combines them into read-only `nativeGames`, `externalGames`, `allGames`, and `getGameBySlug`. Never edit generated files or add a second list to the Games page. Cards, search, categories, featured games, favorites, and recently played all derive from `allGames`.

The dev/build scripts invoke generation explicitly as well as declaring `predev`/`prebuild`. This supports Bun versions with differing lifecycle-hook behavior. Generation is not a directory watcher: after adding, removing, or changing a game, **restart `bun run dev`** or run generation manually and reload the browser.

## Adding a self-hosted external game

```text
public/external-games/my-html-game/
├── index.html
├── metadata.json
├── thumbnail.png
└── assets/
    ├── game.js
    └── style.css
```

Both index.html and metadata.json are required. Every immediate non-hidden subdirectory is treated as an external game and must satisfy this contract. External directory names may contain only letters, numbers, hyphens, and underscores; slugs follow the stricter slug regex.

The editor schema is `tools/external-game.schema.json`; the generator also checks file existence, exact directory matching, strict SemVer, and global uniqueness. Exact JSON shape (kind may be omitted and will be supplied by the generator):

```json
{
  "slug": "my-html-game",
  "title": "My HTML Game",
  "description": "A self-hosted HTML5 game.",
  "category": "arcade",
  "thumbnail": "/external-games/my-html-game/thumbnail.png",
  "featured": false,
  "tags": ["classic"],
  "controls": [
    {
      "label": "Move",
      "keys": ["Arrow keys"],
      "description": "Move with keys or touch."
    }
  ],
  "supportsTouch": true,
  "supportsKeyboard": true,
  "supportsFullscreen": true,
  "sourcePath": "/external-games/my-html-game/",
  "version": "1.0.0",
  "sandbox": "allow-scripts"
}
```

The common fields obey the same validation rules. `sourcePath` must exactly equal the discovered directory's public path with a trailing slash. It may never contain `..`, an external URL, or a path outside `/external-games/`. The thumbnail must exist inside that exact directory. Unknown fields, `scoreLabel`, unsafe sandbox tokens, and mismatched paths fail validation. HTML and JavaScript are never executed by the generator.

Use only relative references such as `assets/game.js` and `assets/style.css`. Package every game asset locally under the same game directory. Do not use remote CDNs, absolute application paths, parent-directory traversal, service workers, or parent-window integrations. `src/proxy.ts` applies a restrictive content policy scoped to the game's directory. Test any game that fetches its own assets: opaque-origin sandbox CORS behavior may affect fetch/XHR even when script/image loading works.

## Sandbox policy and external player

The **only** supported sandbox is `allow-scripts`. Do not add `allow-same-origin`, top navigation, popups, downloads, or form permissions. There are no exceptions in this implementation. The player renders a normal iframe, never `dangerouslySetInnerHTML` or `srcdoc`, and uses an accessible title and no-referrer policy. It displays loading feedback, a 12-second timeout/error state, and reload. Fullscreen is initiated by the parent game's visible user control.

Without same-origin permission the iframe has an opaque origin and cannot access parent DOM, cookies, or localStorage. External game internal saves are therefore session-only. Parent favorites and recent history still work. The example Color Tap game is fully playable under this policy. Do not add a postMessage bridge without separately validating sender identity, origin expectations, and payloads.

## Lazy loading and retry

`/games/[slug]` resolves metadata and returns a not-found page for unknown slugs. The client `NativeGameLoader` calls only the selected definition's `load()` inside React.lazy/Suspense. A module-level cache preserves successful component loads across navigation. Failed imports show an accessible error with a retry button; retry replaces the failed lazy entry. The native module is not requested by the library index. The external definition selects `ExternalGamePlayer` instead.

## Diagnose failures

Errors include the offending metadata/directory path and the reason. For duplicates, both source paths are named. Change the metadata slug, not necessarily the directory name. For partial directories, add the missing file or remove the unfinished plugin directory. For thumbnail errors, place the actual file under public and use its absolute public path. For external source mismatch, copy the discovered folder path exactly, including the trailing slash. Never repair an error by editing generated output.

## Acceptance tests

```bash
bun install --frozen-lockfile
bun run games:generate
bun run typecheck
bun run lint
bun run test
bun run build
bunx playwright install --with-deps chromium
bun run test:e2e
```

`tests/registry.test.ts` creates disposable directories, verifies native and external discovery, imports their generated unified registry, and exercises invalid fields, duplicates, partial directories, sorting, and idempotency. Fixture native components throw if executed during generation; external HTML also contains executable traps which must never run. Temporary fixtures are deleted after every test.

`tests/loading.test.tsx` verifies no native loads on the library, loading before resolution, selected-module-only loading, successful caching, failed-load retry, sandbox policy, timeout/reload, favorites, and recent history. `tests/selection.test.tsx` verifies native/external/not-found selection. `tests/game-runtime.test.tsx` mounts every native game, starts gameplay, checks runtime reports, accessible controls, and effect cleanup, and exercises actual pure game rules. Proxy tests check IP ranges, DNS, signed sessions, header isolation, pinning, redirects, rate limits, timeouts, content limits, and URL rewriting.

Playwright runs desktop and mobile viewport integration checks. Enable `LIVE_PROXY_TEST=1 bun run test:e2e` on a machine with unrestricted public outbound access to include the live example.com check. Add meaningful gameplay tests when creating a new game. A new plugin should be included by generation without editing registry.ts or the library page. The tests deliberately expect the seven shipped native games; update the shipped-game acceptance assertion when intentionally adding a permanent native game, while retaining the fixture discovery tests.
