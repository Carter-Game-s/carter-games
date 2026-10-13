import importlib.util
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("watch", Path(__file__).with_name("watch.py"))
watch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watch)


class WatchTests(unittest.TestCase):
    def run_watch(self, state, repository="Carter-Game-s/carter-games"):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "github-token").write_text("test-only-credential")
            response = io.BytesIO(json.dumps({"name": "carter-test", "state": state, "repository": {"full_name": repository}}).encode())
            with patch.dict(os.environ, {"CARTER_CODESPACE": "carter-test", "CARTER_REPOSITORY": "Carter-Game-s/carter-games", "CREDENTIALS_DIRECTORY": directory}), patch("urllib.request.urlopen", side_effect=[response, io.BytesIO(b"")]) as request:
                watch.check()
                return request.call_args_list

    def test_available_is_not_restarted(self):
        self.assertEqual(len(self.run_watch("Available")), 1)

    def test_stopped_is_started(self):
        calls = self.run_watch("Shutdown")
        self.assertEqual(len(calls), 2)
        request = calls[1].args[0]
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.full_url, "https://api.github.com/user/codespaces/carter-test/start")

    def test_wrong_repository_is_rejected(self):
        with self.assertRaises(ValueError):
            self.run_watch("Shutdown", "other/repository")

    def test_transition_is_left_alone(self):
        self.assertEqual(len(self.run_watch("Starting")), 1)


if __name__ == "__main__":
    unittest.main()
