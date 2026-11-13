import argparse
import subprocess
import sys
import time
from pathlib import Path


def adb(serial, *args, timeout=15):
    return subprocess.run(
        ["adb", "-s", serial, *args],
        check=True,
        stdout=subprocess.PIPE,
        timeout=timeout,
    ).stdout


def wait_ready(serial, seconds):
    deadline = time.monotonic() + seconds
    while (remaining := deadline - time.monotonic()) > 0:
        try:
            if adb(
                serial, "shell", "getprop", "sys.boot_completed",
                timeout=min(remaining, 5),
            ).strip() == b"1":
                return
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            pass
        time.sleep(max(0, min(1, deadline - time.monotonic())))
    raise RuntimeError(f"{serial} did not complete Android boot within {seconds}s")


def main():
    parser = argparse.ArgumentParser(description="Control one Android test device.")
    parser.add_argument("--serial", required=True)
    commands = parser.add_subparsers(dest="command", required=True)
    wait = commands.add_parser("wait")
    wait.add_argument("--seconds", type=int, default=120)
    capture = commands.add_parser("capture")
    capture.add_argument("output", type=Path)
    tap = commands.add_parser("tap")
    tap.add_argument("x", type=int)
    tap.add_argument("y", type=int)
    args = parser.parse_args()

    if not args.serial.strip():
        parser.error("--serial must not be empty")
    if args.command == "wait" and args.seconds <= 0:
        parser.error("--seconds must be positive")
    if args.command == "tap" and min(args.x, args.y) < 0:
        parser.error("tap coordinates must be non-negative")

    try:
        if args.command == "wait":
            wait_ready(args.serial, args.seconds)
        elif args.command == "tap":
            adb(args.serial, "shell", "input", "tap", str(args.x), str(args.y))
        else:
            png = adb(args.serial, "exec-out", "screencap", "-p")
            if not png.startswith(b"\x89PNG\r\n\x1a\n") or not png.endswith(
                b"\x00\x00\x00\x00IEND\xaeB\x60\x82"
            ):
                raise RuntimeError("Device did not return a complete PNG stream")
            with args.output.open("xb") as output:
                output.write(png)
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
