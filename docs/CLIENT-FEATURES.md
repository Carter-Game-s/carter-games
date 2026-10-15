# Carter Games client feature expansion

Implementation checkout: `/root/carter-feature-expansion`, branch
`feature/client-expansion`. Production source, `.env.local`, PM2, Cloudflare,
Ollama, the configured model, and the asset preloader have not been changed.
The implementation was tested before release. The user subsequently authorized
committing, publishing and deploying this feature expansion. Release operations
retain the original environment and restart only the website process.

## Implemented systems

| System              | Interface and behavior                                                                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quick Hide          | Settings toggle, validated destination, three shortcuts, mobile navigation button, test/reset. Uses `location.replace`. Ignores key repeats, editable fields, open dialogs, fullscreen and game shortcut contexts. No activation logging.    |
| Game Roulette       | Games → Surprise Me; actual registry, category/favorites/recent filters, animated selection wheel, metadata and Play Now. Reduced motion skips spinning.                                                                                     |
| Achievements        | Games gallery; nine criteria, progress, icons, unlock timestamps, optional notifications. Driven by game starts, scores, active time and favorites.                                                                                          |
| Statistics          | Games dashboard; launches, unique games, active time, longest session, recent/most-played games, scores, favorites and achievement progress. Reset requires confirmation.                                                                    |
| Command palette     | Header search button or Ctrl/Cmd K; keyboard results, pages/games, theme toggle, browser tabs, achievements/statistics/roulette. Native modal supplies focus containment.                                                                    |
| Homepage            | Customize homepage; nine widget types, visibility, ordering by drag or accessible buttons, density, reset. Original homepage is the default.                                                                                                 |
| AI history          | Stable local conversations with timestamps; new, search, rename, delete, reopen/continue, export, clear. Destructive operations confirm.                                                                                                     |
| AI improvements     | Edit/resend, regeneration, stop, message/code copy, safe Markdown with lightweight syntax coloring, titles, temporary mode, streaming status and retry errors. Existing API/model retained.                                                  |
| Settings backups    | Versioned allowlisted JSON; bounded upload, schema validation, preview, cancel/apply, theme/group support. No arbitrary storage keys or provider credentials.                                                                                |
| Tab groups          | Create/name/color, assign/move tabs, collapse/expand, reorder groups and tabs, rename/delete. Group deletion preserves tabs. Both existing browser renderers share the model.                                                                |
| Session restoration | Opt-in in Settings; tab order, selected tab, groups, app-owned navigation entries. No cookies, headers or credential-bearing URLs are serialized.                                                                                            |
| Game saves          | Settings → Game saves; supported-game exports, bounded validated import, content preview, selected restore, explicit conflict policy, confirmed individual reset. Existing GameStorage namespace retained.                                   |
| Appearance          | Dedicated Settings section; 18 previews, immediate application, custom editor and live preview, save/edit/rename/duplicate/delete/reset, JSON import/export, system appearance, fonts/density/corners/motion/gradients/animations/intensity. |

## Themes

Default Dark (original tokens), Default Light, Midnight, OLED Black, Nord,
Dracula, Catppuccin Mocha, Catppuccin Latte, Tokyo Night, Gruvbox Dark,
Solarized Dark, Solarized Light, Rose Pine, Cyberpunk, Forest, Ocean, Sunset,
and Monochrome. A validated before-paint bootstrap restores the saved palette;
invalid data falls back to Default Dark. Third-party game/site interiors are
not recolored. Custom colors are hex values, fonts are allowlisted and sizes
are bounded; imports never execute CSS or JavaScript.

## Storage and migration

All data uses the existing `orbit:` localStorage abstraction. No account,
database, tracking service or paid API is introduced. New schema version is 1:

- `preferences`: Quick Hide, session restoration, notification and command options.
- `appearance`: selected palette, custom themes and appearance options.
- `home`: enabled flag, widget order/visibility and density.
- `statistics`: per-game launches/time/best/last, play days, longest session, roulette.
- `achievements`: unlocked criterion IDs and dates.
- `conversations`: stable IDs, titles, created/updated timestamps and user/assistant messages.
- `browser-session`: validated tabs, active ID and groups when restoration is enabled.
- `browser-groups`: versioned group metadata, without tab URLs.

Legacy settings and `game:<slug>:<key>`, favorites, recent games, searches and
soundboard keys are preserved. Existing dark/light/system appearance preferences
are accepted without a forced migration that would discard other settings.
Malformed new schemas fall back safely. Quota failures raise an accessible notice.
Transient open-tab metadata uses sessionStorage for command switching; it is
cleared with that browser session. API access tokens stay in request memory.

Export formats are `carter-settings`, `carter-theme`, `carter-saves`, and
`carter-conversation`, each with version 1. Settings uploads are capped at 2 MiB,
theme uploads at 64 KB, and save backups at 8 MiB. Native save types and packed
HTML save maps are validated before restoration. Unrelated storage keys are
never imported.

## Implementation locations

- `src/lib/client/`: validation, preferences, themes, gaming events, active-time
  hook, conversation operations, browser session schema and backup boundaries.
- `src/components/features/`: shared modal/tools, palette, appearance editor,
  homepage editor, roulette, gaming dashboard, tab workspace, safe Markdown,
  Quick Hide/settings backups and game save manager.
- `src/app/games/{roulette,achievements,statistics}` and
  `src/app/settings/{appearance,saves}`: integrated feature routes.
- Existing shell, homepage, Settings, Games, chat and both browser components
  are extended; native runtime callbacks and the existing packed-game bridge
  provide statistics events.
- `tests/client-systems.test.ts`, `tests/client-ui.test.tsx`,
  `e2e/features.spec.ts`: new automated coverage.
- `playwright.features.config.ts` and `playwright.regression.config.ts`: target
  an isolated server; neither starts or reuses production port 3000.

## Verification

- Lint: clean full-project ESLint run; final storage and browser-test changes also checked.
- Unit tests: all 17 files and 146 tests passed in the full suite. The subsequent
  legacy Light migration regression was added and passed with all 24 feature
  logic tests (147 distinct tests now exist, including this additional case).
- Browser tests: all 14 new feature flows and all 12 existing regression checks
  passed in Chromium desktop and Pixel 7 mobile emulation against the isolated
  production build. Existing tests include all native games and safe public/private
  proxy behavior. New flows cover settings, commands, homepage persistence,
  appearance, roulette, achievements/statistics, tab groups/restoration, save and
  settings imports, chat editing/regeneration/history/temporary mode and Quick Hide.
- Final-build browser rechecks: six desktop/mobile flows passed for themes,
  browser groups and chat. The corrected legacy Light migration test passed
  on both screen sizes. All eight final-build checks passed (34 successful
  browser executions across the initial and final verification runs). Initial migration test selector/expected-font
  mistakes were corrected without relaxing the persistence assertions.
- A real Ollama response succeeded through the new chat interface, with no browser
  errors. Other chat browser tests use deterministic streaming fixtures.
- Game contracts and registry: validated 7 native and 354 external games.
- Production compilation and TypeScript: isolated reviewed build and final rebuild
  with the legacy migration fix both succeeded.
- Production preservation: existing website and Cloudflare URL returned HTTP 200;
  website/tunnel PM2 PIDs remained unchanged. Ollama, asset preloader and PM2
  systemd services remain active. Existing stopped/unrelated applications were
  not changed. Original environment contents match the isolated copy.

New unit coverage includes unsafe URLs/protocols, shortcuts/repeats, all 18
palettes, custom schemas, quota errors, every achievement criterion, active-time
rules, roulette exclusions, backup/import boundaries, native-save conflicts,
conversations/regeneration/abort, Markdown safety, layout persistence and sessions.
Initial external-game bridge capability and development dialog-cleanup failures
were fixed, retaining the existing regression assertions.

## Limits and configuration

- Data stays in the current browser profile and origin. Backups are necessary
  when changing origins, devices or clearing browser storage.
- Native games expose real playing/paused states. Packed external games report
  input activity, but external games without a pause/input contract can only
  supply visible activity estimates. The dashboard explains this distinction.
- External IndexedDB, remote/account saves and unsupported sandboxed games cannot
  be exported. Supported packed games use their existing local save bridge.
- Session restoration recreates Carter navigation entries and URLs, not private
  website history, login sessions, forms or remote browser cookies. Sensitive
  authentication URLs are excluded.
- Markdown supports common blocks/inline formatting and escaped raw HTML.
  Syntax coloring is a small common-token highlighter rather than a full IDE.
- Conversation limits are 100 saved conversations and 200 messages each. Limits
  are reported without silently deleting older history. Existing API context
  limits apply only to messages sent for generation.
- Chromium desktop and mobile emulation were tested. Firefox, Safari and physical
  mobile devices remain unverified.
- No new server configuration is required for local client features. Existing
  Ollama and optional browser integrations keep their current configuration.
- Deployment and publication were subsequently authorized by the user.

## Files changed

Modified existing files:

- `.gitignore`
- `playwright.config.ts`
- `public/offline-game-runtime.js`
- `src/app/games/page.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/browser/browser.tsx`
- `src/components/browser/full-browser.tsx`
- `src/components/chat/chat.tsx`
- `src/components/games/external-game-player.tsx`
- `src/components/games/game-player.tsx`
- `src/components/layout/shell.tsx`
- `src/lib/storage/index.ts`
- `src/lib/storage/settings.ts`
- `src/lib/storage/use-storage.ts`
- `src/styles/globals.css`

Created files:

- `docs/CLIENT-FEATURES.md`
- `e2e/features.spec.ts`
- `playwright.features.config.ts`
- `playwright.regression.config.ts`
- `src/app/games/achievements/page.tsx`
- `src/app/games/roulette/page.tsx`
- `src/app/games/statistics/page.tsx`
- `src/app/settings/appearance/page.tsx`
- `src/app/settings/saves/page.tsx`
- `src/components/features/appearance.tsx`
- `src/components/features/backup-settings.tsx`
- `src/components/features/browser-workspace.tsx`
- `src/components/features/client-tools.tsx`
- `src/components/features/command-palette.tsx`
- `src/components/features/gaming-dashboard.tsx`
- `src/components/features/home-customizer.tsx`
- `src/components/features/markdown.tsx`
- `src/components/features/modal.tsx`
- `src/components/features/quick-hide-settings.tsx`
- `src/components/features/roulette.tsx`
- `src/components/features/save-manager.tsx`
- `src/lib/client/backups.ts`
- `src/lib/client/browser-session.ts`
- `src/lib/client/conversations.ts`
- `src/lib/client/gaming.ts`
- `src/lib/client/preferences.ts`
- `src/lib/client/themes.ts`
- `src/lib/client/use-playtime.ts`
- `src/lib/client/validation.ts`
- `tests/client-systems.test.ts`
- `tests/client-ui.test.tsx`
