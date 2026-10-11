# Security policy

Security fixes target the latest default branch. Do not publish exploit details,
credentials, private deployment URLs, or personal information in public issues.

Use GitHub's **Security → Advisories → Report a vulnerability** when private
vulnerability reporting is enabled. Otherwise contact Carter through a private
channel already established with you. Do not put secrets in a public issue to
request contact.

Include the affected commit, reproduction steps, impact, and a minimal sanitized
example. The maintainer will investigate; this project does not promise a fixed
response time or a bug bounty.

The proxy is read-only and intentionally blocks private destinations and upstream
credentials. Same-origin checks and capability tokens are not user authentication.
Before hosting publicly, add deployment access controls and appropriate shared
rate limits. Keep Codespaces ports private. Optional asset-service credentials
and SSH keys belong outside the repository.
