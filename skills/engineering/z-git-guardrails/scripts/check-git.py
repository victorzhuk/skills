#!/usr/bin/env python3
"""Filter literal Git invocations. This is not a shell permission boundary."""

import json
import os
import re
import shlex
import subprocess
import sys


def options(operation, args):
    protected = {
        "reset": ("hard",),
        "clean": ("force",),
        "restore": ("staged", "worktree", "no-staged"),
        "checkout": ("force",),
        "branch": ("delete", "force"),
    }.get(operation, ())
    values = {
        "checkout": {"b", "B", "--orphan", "--conflict", "--pathspec-from-file"},
        "restore": {"s", "--source", "--conflict", "--pathspec-from-file"},
        "clean": {"e", "--exclude"},
        "branch": {"u", "--set-upstream-to", "--contains", "--no-contains", "--merged", "--no-merged", "--points-at", "--format", "--sort"},
        "reset": {"--pathspec-from-file"},
    }.get(operation, set())
    flags, operands = set(), []
    remaining = iter(args)
    for arg in remaining:
        if arg == "--":
            operands.extend(remaining)
            break
        if arg.startswith("--"):
            name, separator, _ = arg.partition("=")
            if name == "--no-staged" or any(
                target.startswith(name[2:]) and name != "--" + target
                for target in protected
            ):
                return flags, operands, "spell guarded Git options in full"
            flags.add(name)
            if name in values and not separator:
                next(remaining, None)
        elif arg.startswith("-") and arg != "-":
            for i, letter in enumerate(arg[1:], 1):
                flags.add(letter)
                if letter in values:
                    if i == len(arg) - 1:
                        next(remaining, None)
                    break
                if letter == "t" and operation in ("checkout", "branch"):
                    break
        else:
            operands.append(arg)
    return flags, operands, None

def strip_continuations(command):
    out = []
    i = 0
    single = False
    while i < len(command):
        c = command[i]
        if c == "'":
            single = not single
            out.append(c)
            i += 1
        elif not single and c == "\\" and i + 1 < len(command) and command[i + 1] == "\n":
            i += 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def check(command, cwd):
    command = strip_continuations(command)
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|()\n")
        lexer.whitespace = " \t\r"
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        return "cannot parse shell command"

    segments = [[]]
    for token in tokens:
        if token and all(c in ";&|()\n" for c in token):
            segments.append([])
        else:
            segments[-1].append(token)
    segments = [s for s in segments if s]

    for words in segments:
        while words and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", words[0]):
            words = words[1:]
        if not words or os.path.basename(words[0]) != "git":
            continue
        if any(c in command for c in "$`<>"):
            return "expand or redirect Git commands only under host permission controls"

        args = words[1:]
        context = []
        configured = False
        while args and args[0].startswith("-"):
            option = args.pop(0)
            if option in ("-C", "--git-dir", "--work-tree", "-c", "--config-env"):
                if not args:
                    return "missing Git option value"
                value = args.pop(0)
                if option in ("-c", "--config-env"):
                    configured = True
                else:
                    context.extend((option, value))
            elif option.startswith(("--git-dir=", "--work-tree=", "-C")):
                context.append(option)
            elif option.startswith(("-c", "--config-env=")):
                configured = True
            elif option not in ("--no-pager", "--paginate", "--no-optional-locks", "--version", "--help"):
                return "unsupported Git global option"
        if not args:
            continue
        operation, *args = args
        flags, operands, reason = options(operation, args)
        if reason:
            return reason
        if operation == "push":
            return "Git push"
        if operation == "reset" and "--hard" in flags:
            return "Git hard reset"
        if operation == "clean" and ("--force" in flags or "f" in flags):
            return "Git forced clean"
        if operation == "restore" and "--staged" not in flags and "S" not in flags:
            return "Git worktree restore"
        if operation == "restore" and ("--worktree" in flags or "W" in flags):
            return "Git worktree restore"
        if operation == "checkout" and ("--" in args or "." in operands or "f" in flags or "--force" in flags):
            return "Git checkout discarding paths"
        if operation != "branch":
            continue
        force_delete = "D" in flags or (
            ("d" in flags or "--delete" in flags) and ("f" in flags or "--force" in flags)
        )
        if not force_delete:
            continue
        if len(segments) != 1 or configured or words != segments[0]:
            return "force-delete requires an isolated literal Git command"
        branches = operands
        if not branches:
            return "missing branch name"
        for branch in branches:
            try:
                result = subprocess.run(
                    ["git", *context, "merge-base", "--is-ancestor", branch, "HEAD"],
                    cwd=cwd, stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5,
                )
            except (OSError, subprocess.TimeoutExpired):
                return "cannot verify branch ancestry"
            if result.returncode != 0:
                return "force-delete of an unmerged or unknown branch"
    return None


def main():
    try:
        payload = json.load(sys.stdin)
        command = payload.get("tool_input", {}).get("command", "")
        cwd = payload.get("cwd") or os.getcwd()
        if not isinstance(command, str) or not isinstance(cwd, str):
            raise ValueError("invalid hook fields")
        reason = check(command, cwd)
    except (ValueError, TypeError, AttributeError):
        reason = "invalid hook input"
    if reason:
        print(f"BLOCKED: {reason}. Review the operation through the host permission controls.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
