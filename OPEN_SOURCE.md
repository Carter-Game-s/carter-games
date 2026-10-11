# Open source release preparation

The original Carter Game's application code is licensed under MIT. This document
tracks publication readiness; adding a license does not make a private GitHub
repository publicly accessible.

- The app and README identify Carter and credit AI assistance from OpenAI Codex.
- LICENSE, CONTRIBUTING.md, SECURITY.md, THIRD_PARTY.md, issue templates, a pull
  request template, and an automated validation workflow are included.
- Local development works without the private VPS. Environment files, caches,
  runtime logs, dependencies, build output, and private keys are ignored.
- User progress keeps its existing internal `orbit:` keys during the rebrand.

## Before making the repository public

1. Review the entire Git history for credentials and private operational details.
   Removing a file in a new commit does not remove earlier copies. Rotate any
   exposed credential before publishing and remove it from history where needed.
2. Review [THIRD_PARTY.md](THIRD_PARTY.md). The upstream game pack currently has
   no declared repository license. Its games are not covered by this project's
   MIT license. Confirm permission or licensing for any game redistribution or
   public hosting; exclude content that cannot be cleared.
3. Enable GitHub private vulnerability reporting and review repository access,
   branch protection, and Actions permissions.
4. Confirm the validation workflow passes and review README instructions from a
   fresh clone with no private environment configuration.
5. Publish only after these reviews. Public repository visibility does not imply
   that the running Codespace or VPS should become publicly accessible.

The repository name and existing Codespace address can remain unchanged during
the rebrand so deployment integrations continue to work.
