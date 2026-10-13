# Codespace automatic startup

The application supervisor runs inside the Codespace. This separate timer runs on an always-on Linux server and requests GitHub startup when the configured Codespace is stopped. It checks once per minute and leaves running or transitioning Codespaces alone. The existing forwarded application URL stays the same.

Automatic startup can consume GitHub Codespaces compute even when nobody is playing. GitHub account limits, exhausted quotas, expired credentials, deleted Codespaces, and source-account policies can still prevent startup.

Install `watch.py` as `/opt/carter-codespace-watch/watch.py` and the service/timer units in `/etc/systemd/system/`. Configure `/etc/carter-codespace-watch/config` with nonsecret settings:

```dotenv
CARTER_CODESPACE=YOUR_EXISTING_CODESPACE_NAME
CARTER_REPOSITORY=YOUR_ORGANIZATION/YOUR_REPOSITORY
```

Provision a GitHub credential with Codespaces access in `/etc/carter-codespace-watch/github-token`, owned by root with mode `0600`. Keep it outside Git. Prefer a credential limited to the required repository and permissions. systemd supplies it through `LoadCredential` to a dynamic service user; the script never prints its value.

Validate the units, reload systemd, run the service once, and enable `carter-codespace-watch.timer`. To disable automatic startup, stop and disable that timer. The service never deletes a Codespace or changes a repository's privacy.

Run the offline behavior checks with `python3 infra/codespaces/test_watch.py`. They verify startup only for a stopped, correctly identified Codespace, and no restarts for running or transitioning instances. Test a real startup separately after installing the timer.
