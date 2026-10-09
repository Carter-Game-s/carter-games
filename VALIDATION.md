# Validation results

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
