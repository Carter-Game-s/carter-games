# Contributing to Carter Game's

Thank you for helping improve Carter Game's. Carter created this project with
AI assistance from OpenAI Codex. AI-assisted contributions are welcome; describe
the assistance in your pull request and review and test the result yourself.

## Development

Install Node.js 22+ and Bun, clone the repository, and run:

```bash
bun install --frozen-lockfile
bun run dev --hostname 0.0.0.0
```

No VPS, account, or secret is required for local development. Imported games
download from the pinned upstream source when played. See [README.md](README.md)
and [GAME_DEVELOPMENT.md](GAME_DEVELOPMENT.md) for the architecture and game contract.

Before submitting a pull request:

```bash
bun run games:generate
bun run typecheck
bun run lint
bun run test
bun run build
```

For player or layout changes, also check desktop and mobile browser behavior.
Explain the problem, the resulting behavior, and the checks you ran. Keep changes
focused. Retain existing local storage keys so users keep their progress.

## Games and security

Preserve all seven native games and the proxy's address validation, DNS pinning,
redirect checks, origin checks, size limits, and timeouts. Imported games must
retain their opaque sandbox, network restrictions, and integrity verification.
Never add `allow-same-origin` to a game iframe to work around a compatibility bug.

New game submissions must identify their source and redistribution license or
permission. A publicly accessible download is not a license. See
[THIRD_PARTY.md](THIRD_PARTY.md). Do not commit game caches, build output,
dependencies, passwords, SSH keys, credentials, or environment files.

## Reporting problems

Use GitHub issues for reproducible bugs and feature requests. Include the game
or route, browser, steps to reproduce, and expected and actual behavior.
Remove private URLs and credentials from screenshots and logs. Report security
issues privately as described in [SECURITY.md](SECURITY.md).

Be respectful and constructive. Contributions to the original application code
are made under the project's MIT license; third-party material retains its own
terms.
