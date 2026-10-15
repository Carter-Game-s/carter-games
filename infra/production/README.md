# Carter Games VPS

The website uses PM2 with `ecosystem.config.cjs`. Next.js loads `.env.local`
from the project working directory. It binds to localhost behind the existing
`cloudflare-tunnel` PM2 process. Do not restart that Quick Tunnel unnecessarily;
its URL can change. A stable address needs an account-managed named tunnel and domain.

Ollama uses `carter-ollama.service`, not PM2 or the development startup scripts.
Install the unit into `/etc/systemd/system`, reload systemd and enable it.
The unit is specific to this six-CPU Ubuntu VPS and reserves CPUs 4 and 5 for
inference, with one parallel request, one loaded model, a 4096-token context,
a bounded queue and 2 GiB memory limit. The installed `qwen2.5:0.5b` model has
`num_thread=2` stored in its local parameters to avoid CPU oversubscription.
No additional model weights are required. Ollama listens only on 127.0.0.1.

Do not run `.devcontainer/supervise.sh` alongside PM2. It is a detached development
supervisor with scheduled restarts. The development asset launcher also detaches
multiple processes and exits; it is not suitable as a PM2 service.

Asset SSH forwarding and administration forwarding are optional development
integrations, disabled on this VPS because their host and credentials are absent.
Games use the existing local/cache/upstream asset fallbacks. The optional browser
engine needs an explicitly configured `BROWSER_ENGINE_URL`; without it the site
uses its existing same-origin browser. Do not publish private asset/admin services.

Build in a separate directory containing a copy of the current sources and
`.env.local`, with Bun and the existing lockfile. Only after a successful build,
stop **orbit-proxy-games**, retain the old `.next` directory, install the new
`.next`, and start the application with this ecosystem file. Immediately verify
local and public HTTP, chat discovery and real generation. Save the verified
process list with `pm2 save`; `pm2-root.service` must be enabled. Never restart
unrelated PM2 applications. Keep configuration backups outside the repository
with owner-only permissions. No reboot is needed to validate enablement.
