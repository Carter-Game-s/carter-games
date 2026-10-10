# Validation results

## Repository setup verification — 2026-10-09

The imported project was checked from a fresh clone of the private GitHub repository:

- `bun install --frozen-lockfile`, `bun run games:generate`, `bun run typecheck`, `bun run lint`, `bun run test`, and `bun run build` passed.
- Registry generation confirmed all seven native games and one external game; all 81 unit/component tests passed.
- Desktop/mobile integration passed all 10 enabled checks using installed Chromium and a temporary test configuration with a 120-second test timeout and 20-second assertion timeout. The original timing limits were insufficient on this server. The two opt-in live public-site checks remained skipped.
- The supervised development server runs `bun run dev --hostname 0.0.0.0`; its homepage returned HTTP 200. Live API checks confirmed session issuance, private-address rejection, and rejection of foreign-origin session requests.
- GitHub confirmed private repository visibility and the pushed import commit. Hidden configuration files are included; dependencies, build output, environment secrets, and runtime logs are excluded.
- Initial validation ran outside Codespaces; the subsequent Codespaces checks are recorded below.

### Codespaces follow-up

- Created `orbit-proxy-games-7vw5xvrv6j6ghwpv7` from this private repository using `.devcontainer/devcontainer.json` on a 2-core, 8-GB machine.
- Added the standard SSH feature for remote startup verification and launched the dev server in a separate session so it survives lifecycle/SSH shell exit.
- Bun frozen-lockfile installation and the container configuration test passed. The running code includes commit `8eb9515`.
- The homepage returned HTTP 200 through GitHub CLI's authenticated tunnel. GitHub reported port 3000 visibility as `private`.
- Verified the startup script reuses the same server PID on a second invocation, and the server remains running after the SSH connection closes.
- Private application URL: https://orbit-proxy-games-7vw5xvrv6j6ghwpv7-3000.app.github.dev
- The Codespace has a 30-minute idle timeout and 72-hour stopped-environment retention period. The unused Codespace created during initial setup was removed.

The results below were included in the original archive.

### Production forwarded-origin correction

- Captured sanitized headers through the actual private forwarding URL: GitHub rewrites the matching browser Origin to `http://localhost:3000`, while preserving the configured forwarded hostname and HTTPS protocol. Foreign origins remain unchanged.
- Session issuance accepts this rewrite only with the configured Codespace metadata, exact local origin/host, expected forwarded hostname, HTTPS forwarding, and `Sec-Fetch-Site: same-origin`. Missing or incorrect metadata and foreign/cross-site origins remain rejected.
- All 83 tests, lint, typecheck, and the production build passed. Restarted with `bun run start` and explicitly inherited Codespaces hostname variables.
- Verified the actual private HTTPS URL with authenticated requests: legitimate session HTTP 200; foreign-origin and cross-site requests HTTP 403.
- Verified the supplied `/browser?url=https%3A%2F%2Fexample.com` page in Chromium through the actual private HTTPS forwarding layer: the public site's content is visible inside the sandboxed iframe, with no browser JavaScript errors. Temporary header diagnostics were stopped and removed from the production process.

### Search correction — 2026-10-10

- Provider probes from the Codespace found that the default DuckDuckGo JavaScript page returned no results, its HTML endpoint presented a challenge, and Google redirected to a host outside the allowlist. Bing returned 10 HTML results through the protected proxy.
- Bing is now the default provider. DuckDuckGo uses its HTML endpoint, and existing Google/DuckDuckGo searches expose a query-preserving **Search with Bing** fallback. Provider selection remains available.
- All 87 tests, lint, typecheck, and the Codespace production build passed. The Codespace performed `git pull --ff-only` and restarted using `bun run start` with explicit hostname metadata.
- Real authenticated Chromium checks through the private HTTPS URL confirmed homepage search rendered 10 Bing results on desktop and mobile. Both viewport sizes also switched a saved DuckDuckGo search to visible Bing results, with no browser JavaScript errors or horizontal overflow.
- Forwarded session issuance remained HTTP 200 for the correct origin and HTTP 403 for foreign-origin/cross-site requests. Proxy protections and all seven native games were preserved.

Verified on the delivered source:

| Check                                                        | Result                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Bun dependency installation from lockfile                    | Passed                                                                       |
| Native and external registry generation                      | Passed: 7 native, 1 external                                                 |
| Strict TypeScript                                            | Passed                                                                       |
| ESLint                                                       | Passed, no warnings                                                          |
| Unit and component acceptance tests                          | 81 passed                                                                    |
| Chromium desktop/mobile integration                          | 10 passed                                                                    |
| Browser errors and hydration errors in final integration run | None recorded                                                                |
| Mobile touch activation and horizontal overflow checks       | Passed                                                                       |
| Native gameplay for all seven games                          | Passed at both viewport sizes                                                |
| External Color Tap gameplay with `allow-scripts` sandbox     | Passed at both viewport sizes                                                |
| Production Webpack build                                     | Passed                                                                       |
| Bun feature OCI manifest, tag `0`                            | Available, HTTP 200                                                          |
| Codespaces lifecycle scripts executed locally | Passed: setup, startup, restart reuse, unchanged dependencies |
| Real Node socket with pinned DNS | Passed, including automatic-family array results |
| Fresh GitHub Codespace creation                              | Not executed in a GitHub account                                             |
| Live example.com proxy request                               | Unverified: outbound request failed/timed out in this restricted environment |

The live public-site test is explicitly opt-in and was skipped in the final local desktop/mobile suite (two skipped cases). Run `LIVE_PROXY_TEST=1 bun run test:e2e` from Codespaces or a machine with public outbound access. The proxy's DNS pinning, safe redirects, header isolation, timeout, streaming and declared byte limits, status handling, and HTML/CSS rewriting are verified independently by automated transport tests. The browser integration suite verifies private-address rejection through the actual server Route Handler.

Browser QA used Chromium 153 from an available packaged binary because this environment returned a corrupt download from Playwright's browser CDN. The project itself has no dependency on that binary. Normal browser-test installation is `bunx playwright install --with-deps chromium` followed by `bun run test:e2e`.

The browser tests exercise a development server using the same `bun run dev --hostname 0.0.0.0` command configured for Codespaces. Codespaces setup is additionally checked by automated configuration tests. A real fresh Codespace and physical mobile device must be tested in those environments; neither is claimed as locally provisioned or emulated hardware.

## Follow-up proxy correction

The custom DNS lookup adapter now handles both Node callback modes: a single address and an array when `options.all` is true. Node 22+ automatically requests the latter for address-family selection. Returning a scalar caused `Invalid IP address: undefined`; the initial mocked transport tests did not reproduce that behavior. A new real-socket regression test now exercises the adapter against a local HTTP fixture. This test isolates the lookup adapter; production destination validation still blocks all loopback addresses.

The actual `.devcontainer/setup.sh` and `.devcontainer/start.sh` scripts were subsequently executed in the local runtime. Dependency installation succeeded, the server served the homepage, a second start preserved the same server PID and dependency timestamp, signed session issuance worked, the live application rejected a private destination, and external-game responses included the sandbox policy. This verifies the lifecycle scripts locally, not fresh GitHub container provisioning.
