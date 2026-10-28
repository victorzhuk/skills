import importlib.util
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("check-git.py")
SPEC = importlib.util.spec_from_file_location("guard", SCRIPT)
guard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(guard)


class GitFilterTests(unittest.TestCase):
    def test_blocked_literal_commands(self):
        commands = [
            "git push origin main",
            "git -C /tmp push origin main",
            "git -C '/tmp/repo with spaces' --no-pager push",
            "git -c advice.pushUpdateRejected=false push",
            "git reset --hard HEAD",
            "git clean -xdf",
            "git clean --force",
            "git restore --worktree .",
            "git restore --staged --worktree .",
            "git restore --staged -SW .",
            "git checkout HEAD -- .",
            "git checkout -fB topic",
            "git status && git push",
            "git status\ngit push",
            "KEY=value git push",
            "git \\\npush",
            "git push \\\norigin main",
        ]
        for command in commands:
            with self.subTest(command=command):
                self.assertIsNotNone(guard.check(command, "/tmp"))

    def test_allowed_literal_commands(self):
        for command in [
            'echo "git push"', "git status", "git diff --stat",
            "git checkout feature", "git restore --staged .",
            "git restore -S .", "git --version",
            "git worktree list", "git worktree remove ../wt", "git branch -d feature",
            "echo 'git push\\\nfake'",
        ]:
            with self.subTest(command=command):
                self.assertIsNone(guard.check(command, "/tmp"))

    def test_effective_repository_for_merged_branch(self):
        with patch.object(guard.subprocess, "run") as run:
            run.return_value.returncode = 0
            self.assertIsNone(guard.check("git -C 'repo with spaces' branch -D topic", "/tmp"))
            self.assertEqual(run.call_args.args[0], [
                "git", "-C", "repo with spaces", "merge-base", "--is-ancestor", "refs/heads/topic", "HEAD",
            ])
            self.assertEqual(run.call_args.kwargs["cwd"], "/tmp")
            self.assertEqual(run.call_args.kwargs["timeout"], 5)

    def test_abbreviated_guarded_options_do_not_bypass_filter(self):
        with patch.object(guard.subprocess, "run") as run:
            for command in [
                "git reset --har HEAD",
                "git clean --for -d",
                "git restore --staged --worktr file",
                "git restore --stag file",
                "git restore --staged --no-staged file",
                "git branch --dele --for topic",
                "git checkout --for topic",
            ]:
                with self.subTest(command=command):
                    self.assertIsNotNone(guard.check(command, "/tmp"))
            run.assert_not_called()

    def test_option_values_are_not_short_flags(self):
        for command in [
            "git checkout -bfeature",
            "git checkout -Bforce",
            "git checkout -b feature",
            "git restore -sWORKTREE -S file",
            "git restore -SsWORKTREE file",
            "git restore --source WORKTREE --staged file",
            "git clean -efoo",
            "git clean -e foo",
        ]:
            with self.subTest(command=command):
                self.assertIsNone(guard.check(command, "/tmp"))
        for command in ["git checkout -fbfeature", "git clean -efoo -f", "git restore -SWsHEAD file"]:
            with self.subTest(command=command):
                self.assertIsNotNone(guard.check(command, "/tmp"))

    def test_failed_ancestry_and_combined_delete_flags(self):
        with patch.object(guard.subprocess, "run") as run:
            run.return_value.returncode = 1
            for flags in ("-D", "-df", "--delete --force", "--force --delete"):
                self.assertIsNotNone(guard.check(f"git branch {flags} topic", "/tmp"))

    def test_ambiguous_branch_context_does_not_run_probe(self):
        with patch.object(guard.subprocess, "run") as run:
            for command in [
                "cd other && git branch -D topic",
                "GIT_DIR=other git branch -D topic",
                "git -c core.bare=true branch -D topic",
            ]:
                self.assertIsNotNone(guard.check(command, "/tmp"))
            run.assert_not_called()

    def test_hook_input_and_exit_contract(self):
        for command, code in [("git push", 2), ('echo "git push"', 0)]:
            result = subprocess.run(
                ["bash", str(SCRIPT.with_name("block-dangerous-git.sh"))],
                input=json.dumps({"tool_input": {"command": command}, "cwd": "/tmp"}),
                text=True, capture_output=True, timeout=5,
            )
            self.assertEqual(result.returncode, code, result.stderr)
            self.assertEqual("BLOCKED:" in result.stderr, code == 2)

    def test_branch_ancestry_uses_the_deletion_namespace(self):
        with TemporaryDirectory() as repo:
            def git(*args, input=None):
                result = subprocess.run(
                    ["git", "--git-dir", repo, *args], input=input,
                    text=True, capture_output=True, check=True, timeout=5,
                )
                return result.stdout.strip()

            git("init", "--bare")
            tree = git("mktree", input="")
            metadata = "author test <test> 0 +0000\ncommitter test <test> 0 +0000\n"
            base = git("hash-object", "-t", "commit", "-w", "--stdin",
                       input=f"tree {tree}\n{metadata}\nbase\n")
            tip = git("hash-object", "-t", "commit", "-w", "--stdin",
                      input=f"tree {tree}\nparent {base}\n{metadata}\nunmerged\n")
            refs = {
                "refs/heads/current": base,
                "refs/heads/topic": tip,
                "refs/tags/topic": base,
                "refs/heads/merged": base,
                "refs/tags/merged": tip,
                "refs/remotes/origin/topic": tip,
                "refs/heads/origin/topic": base,
                "refs/tags/origin/topic": base,
                "refs/remotes/origin/merged": base,
                "refs/heads/origin/merged": tip,
                "refs/tags/refs/heads/unknown": base,
            }
            for ref, commit in refs.items():
                git("update-ref", ref, commit)
            git("symbolic-ref", "HEAD", "refs/heads/current")

            for command, code in [
                ("git branch -D topic", 2),
                ("git branch -D merged", 0),
                ("git branch -Dr origin/topic", 2),
                ("git branch --remotes -D origin/topic", 2),
                ("git branch -Dr origin/merged", 0),
                ("git branch --remo -D origin/topic", 2),
                ("git branch -r --no-remotes -D topic", 2),
                ("git branch -D unknown", 2),
            ]:
                with self.subTest(command=command):
                    result = subprocess.run(
                        ["bash", str(SCRIPT.with_name("block-dangerous-git.sh"))],
                        input=json.dumps({"tool_input": {"command": command}, "cwd": repo}),
                        text=True, capture_output=True, timeout=5,
                    )
                    self.assertEqual(result.returncode, code, result.stderr)
            for ref, commit in refs.items():
                self.assertEqual(git("rev-parse", "--verify", ref), commit)


if __name__ == "__main__":
    unittest.main()
