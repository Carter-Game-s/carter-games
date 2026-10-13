import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


def check():
    name = os.environ.get("CARTER_CODESPACE", "")
    repository = os.environ.get("CARTER_REPOSITORY", "")
    if not re.fullmatch(r"[a-z0-9-]{1,100}", name) or not re.fullmatch(
        r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository
    ):
        raise ValueError("Invalid watcher configuration")
    token = (Path(os.environ["CREDENTIALS_DIRECTORY"]) / "github-token").read_text().strip()
    if not token or len(token) > 300 or not token.isascii():
        raise ValueError("Invalid credential")
    endpoint = "https://api.github.com/user/codespaces/" + name
    headers = {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "CarterGamesCodespaceWatch/1.0",
    }
    with urllib.request.urlopen(urllib.request.Request(endpoint, headers=headers), timeout=20) as response:
        body = response.read(524289)
    if len(body) > 524288:
        raise ValueError("Oversized GitHub response")
    codespace = json.loads(body)
    if codespace.get("name") != name or codespace.get("repository", {}).get("full_name", "").lower() != repository.lower():
        raise ValueError("Codespace identity does not match configuration")
    state = codespace.get("state")
    if state == "Shutdown":
        request = urllib.request.Request(endpoint + "/start", data=b"", headers=headers, method="POST")
        with urllib.request.urlopen(request, timeout=30):
            pass
        print("Requested startup of the configured Codespace")
    elif state == "Available":
        print("Configured Codespace is running")
    elif state in {"Starting", "Provisioning", "Rebuilding", "ShuttingDown", "Updating"}:
        print("Codespace is transitioning; retrying on the next timer tick")
    else:
        raise ValueError("Codespace requires operator attention")


if __name__ == "__main__":
    try:
        check()
    except urllib.error.HTTPError as error:
        print("GitHub request failed: HTTP " + str(error.code), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print("Codespace watcher failed; check configuration or connectivity", file=sys.stderr)
        sys.exit(1)
