# Validation

Validation is reproducible from the repository root:

```bash
bun install --frozen-lockfile
bun run games:generate
bun run typecheck
bun run lint
bun run test
bun run build
```

The GitHub Actions validation workflow runs these checks without deployment
credentials, a VPS, or cached game binaries. Browser checks can be run separately
with `bun run test:e2e`; see README.md for browser installation and live proxy flags.

## Recorded behavior

- The generated catalog contains seven native games, Color Tap, and 352 imported
  game entries (360 total).
- Automated tests cover native game logic and lifecycle, registry integrity,
  proxy destination and redirect validation, DNS pinning, bounded downloads,
  origin checks, isolated game storage, and offline SDK compatibility.
- The Codespaces production deployment has returned homepage HTTP 200 with
  port 3000 private and `bun run start` supervised outside the SSH session.
- Live browser checks have exercised search, public-page proxy rendering,
  private-address rejection, imported 2048 saves, Eggy Car startup, and Drive Mad.
- A separate loopback-only asset service has cached all 352 imported files,
  verified against their pinned Git blob hashes. Credentials remain outside Git.

These are recorded checks, not a claim that every imported game or external
website works in every browser. Third-party licensing review is separate from
functional validation. This file intentionally omits private deployment addresses.
