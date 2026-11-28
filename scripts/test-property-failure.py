"""Exercise the property failure adapter through its public CLI."""

import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest


ADAPTER = (Path(__file__).resolve().parents[1] / "skills/qa/z-qa-debugger"
           / "scripts/property-failure.sh")


class PropertyFailureTest(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.directory = Path(directory.name)

    def invoke(self, *command):
        return subprocess.run(
            [ADAPTER, "--", *command], cwd=self.directory, capture_output=True,
            env={**os.environ, "TMPDIR": str(self.directory)}, timeout=5,
        )

    def test_success_preserves_argument_and_discards_log(self):
        arg = "a b; exit 9"
        result = self.invoke(sys.executable, "-c",
                             "import sys; assert sys.argv[1] == 'a b; exit 9'; print('noise')", arg)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, b"Test command passed.\n")
        self.assertEqual(list(self.directory.iterdir()), [])

    def test_compiler_failure_without_replay(self):
        result = self.invoke(sys.executable, "-c",
                             "import sys; print('building'); print('compile error', file=sys.stderr); sys.exit(37)")
        self.assertEqual(result.returncode, 37)
        self.assertIn(b"building", result.stdout)
        self.assertIn(b"compile error", result.stdout)
        self.assertEqual(list(self.directory.iterdir()), [])

    def test_timeout(self):
        result = self.invoke("timeout", "0.1s", "sleep", "5")
        self.assertEqual(result.returncode, 124)
        self.assertIn(b"124", result.stdout)

    def test_oversized_failure(self):
        marker = "EPHYRA_REPLAY=123:4"
        result = self.invoke(sys.executable, "-c",
                             "import sys; print('a'*20000); print(sys.argv[1]); print('z'*20000); sys.exit(1)", marker)
        self.assertEqual(result.returncode, 1)
        self.assertIn(marker.encode(), result.stdout)
        self.assertLess(len(result.stdout), 16384 + 512)
        log, = self.directory.iterdir()
        self.assertIn(os.fsencode(log), result.stdout)
        self.assertEqual(log.stat().st_mode & 0o077, 0)
        self.assertGreater(log.stat().st_size, 40000)


if __name__ == "__main__":
    unittest.main()
