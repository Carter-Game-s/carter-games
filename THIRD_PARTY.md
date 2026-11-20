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

## Soundboard and chat

Soundboard metadata links to SoundButtonsWorld. Audio plays directly from its public audio endpoints; sound recordings are not copied into this repository or covered by its MIT license. Each sound includes a source link, and ownership remains with the original creators.

The AI SDK and its OpenAI-compatible provider are Apache-2.0 licensed. The optional local chat runtime uses Ollama and Qwen2.5 0.5B; their runtime and model files are installed outside the repository. Qwen2.5 0.5B is Apache-2.0 licensed. See [CHAT_SETUP.md](CHAT_SETUP.md) for configuration.

## AI assistance

## Interactive browser engine

The independent browser service in `infra/proxy` uses MercuryWorkshop Scramjet 2.0.67-alpha.2, Scramjet Controller 0.0.14, Scramjet Utils 0.0.3, and Epoxy Transport 3.0.1 under AGPL-3.0-only, plus Wisp JS 0.5.0 under LGPL-3.0. The service includes its own license and publicly provides its authored sources and upstream source references at `/source`. These components are credited to MercuryWorkshop; Carter authored the application integration. See [the browser service README](infra/proxy/README.md).

Carter directed the application project with AI assistance from OpenAI Codex.
The credit describes development assistance, not a third-party game ownership
claim or a substitute for reviewing code, security, and licensing.

## Movies & TV

The initial catalog streams the original full-length `Sita Sings the Blues`
from the Internet Archive copy linked by filmmaker Nina Paley. See the
[watch page](https://www.sitasingstheblues.com/watch.html) and
[license and soundtrack terms](https://www.sitasingstheblues.com/license.html).
The [Berlinale program](https://www.berlinale.de/en/2008/programme/20081891.html)
documents the 2008 screening and runtime. The poster is a WebP conversion of
Paley's [press kit artwork](https://www.sitasingstheblues.com/press.html).

`The General` streams a [public-domain silent print](<https://commons.wikimedia.org/wiki/File:The_General_(1926).webm>) from Wikimedia Commons. Its [original United Artists poster](<https://commons.wikimedia.org/wiki/File:The_General_(1926)_-_Movie_Poster.png>) is converted to WebP.

`Caminandes` is © Blender Foundation, [Creative Commons Attribution](https://studio.blender.org/remixing/). The series uses the studio’s linked or published streams and a [Blender Foundation thumbnail](https://video.blender.org/w/23f3ef79-15dc-44c5-aa45-cf92e78a4509).

### Catalog management

An administrator with shell access can run `bun tools/manage-media.ts seed`
to obtain the default catalog, `validate FILE` to check an edited catalog, and
`sudo bun tools/manage-media.ts publish FILE` to atomically replace the live
catalog. `list` reads the current catalog. The site reads the catalog on
request. No public write endpoint or new account permissions are installed.

Review the rights and play each source before publishing. Use direct HTTPS
links to licensed MP4, WebM, or HLS files, including public or browser-usable
S3/R2 URLs. HLS streams and external subtitle tracks need CORS headers. Use
the allowlisted embed formats only when the rightsholder has enabled embeds.
The player does not proxy video, upload media, or store storage credentials.
Continue watching is available for sources controlled by the site's video
player. Third-party embeds manage their own progress and controls.

### Packed game screenshots

- **2048:** screenshot of the game by Gabriele Cirulli, under the
  [MIT license](public/external-games/pack-2048/thumbnail-LICENSE.txt).
- **Google Dino:** screenshot of the Chromium offline game by The Chromium
  Authors, under the
  [BSD license](public/external-games/pack-google-dino/thumbnail-LICENSE.txt).
- **We Become What We Behold:** screenshot of Nicky Case’s artwork, dedicated
  to the public domain under CC0. See the
  [creator’s artwork notice](https://github.com/ncase/wbwwb#made-with-open-culture-for-open-culture).

The additional classic-film entries link to the Wikimedia Commons source
and rights page for each print. Their WebP covers are frames from those
prints. The catalog streams the videos from Wikimedia.
