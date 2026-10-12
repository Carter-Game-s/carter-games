# Third-party notices and license scope

The root [MIT license](LICENSE) covers the original application code, native
game implementations, application-owned SVG artwork, tooling, and documentation
contributed to Carter Game's. It does not relicense third-party games, their
embedded engines, music, artwork, names, trademarks, or package dependencies.

## Imported games

Source: [Offline HTML Games Pack](https://github.com/carteraccs/Offline-HTML-Games-Pack),
commit `d52fe447483251e486a2de49132c8240f8369706`.

The manifest in `src/lib/offline-games/manifest.json` and inventory in
`tools/offline-games-tree.txt` identify all 352 upstream files and their Git blob
hashes. This repository stores catalog entries, original thumbnail artwork, and
launch wrappers; it does not commit the original multi-gigabyte game binaries.
Downloads and caches remain external to Git.

On 2026-10-11 the GitHub repository API reported no declared license for that
pack. Public availability and a verified download hash do not establish
redistribution or public-hosting permission. Each game's rights remain with its
respective owners. No blanket open source license is claimed for the pack.
Before redistributing or publicly hosting any of these games, identify its
author, applicable license, and permissions. Retain any embedded notices.

Eggy Car and Drive Mad are third-party games. The application includes isolated
compatibility adapters for their offline startup; that does not transfer
ownership of their game code or assets to Carter or OpenAI.

## Additional published game

Five Nights at Epstein's uses the Unity build from
[web-ports/fnae](https://github.com/web-ports/fnae) at commit
`c9c8b513a27155bf37c4ab3dee74e99b12b895ba`. Its original engine, artwork, audio,
and video remain third-party property and are excluded from this project's MIT
license. That revision has no repository license file. The build is embedded
without external requests; its browser download-cache adapter is disabled for
the opaque sandbox. Game content and embedded notices are retained.

## Dependencies

Declared licenses below were read from installed direct-package metadata during
release preparation. Use `bun.lock` for the exact dependency graph and consult
each installed package's license files for authoritative terms, including
transitive dependencies. Keep their required notices when distributing bundles.

| Package                     | Installed version | Declared license | Use         |
| --------------------------- | ----------------- | ---------------- | ----------- |
| `next`                      | 16.4.0            | MIT              | Runtime     |
| `react`                     | 19.3.0            | MIT              | Runtime     |
| `react-dom`                 | 19.3.0            | MIT              | Runtime     |
| `lucide-react`              | 0.468.0           | ISC              | Runtime     |
| `cheerio`                   | 1.2.0             | MIT              | Runtime     |
| `ipaddr.js`                 | 2.5.0             | MIT              | Runtime     |
| `@playwright/test`          | 1.64.0            | Apache-2.0       | Development |
| `@tailwindcss/postcss`      | 4.3.3             | MIT              | Development |
| `@testing-library/jest-dom` | 6.10.0            | MIT              | Development |
| `@testing-library/react`    | 16.3.3            | MIT              | Development |
| `@types/node`               | 22.20.5           | MIT              | Development |
| `@types/react`              | 19.3.0            | MIT              | Development |
| `@types/react-dom`          | 19.3.0            | MIT              | Development |
| `eslint`                    | 9.39.5            | MIT              | Development |
| `eslint-config-next`        | 16.4.0            | MIT              | Development |
| `jsdom`                     | 26.1.0            | MIT              | Development |
| `prettier`                  | 3.9.9             | MIT              | Development |
| `tailwindcss`               | 4.3.3             | MIT              | Development |
| `typescript`                | 5.9.3             | Apache-2.0       | Development |
| `vitest`                    | 3.2.7             | MIT              | Development |

## AI assistance

Carter directed the application project with AI assistance from OpenAI Codex.
The credit describes development assistance, not a third-party game ownership
claim or a substitute for reviewing code, security, and licensing.
