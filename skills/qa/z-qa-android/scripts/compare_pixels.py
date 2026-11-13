import argparse
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Compare decoded PNG pixels exactly.")
    parser.add_argument("expected", type=Path)
    parser.add_argument("actual", type=Path)
    parser.add_argument("--diff", type=Path, required=True)
    args = parser.parse_args()

    try:
        from PIL import Image, ImageChops

        with (
            Image.open(args.expected, formats=["PNG"]) as expected,
            Image.open(args.actual, formats=["PNG"]) as actual,
        ):
            if expected.size != actual.size:
                print(f"Size mismatch: expected {expected.size}, actual {actual.size}")
                return 1
            if expected.n_frames != 1 or actual.n_frames != 1:
                raise ValueError("Expected single-frame PNGs")
            delta = ImageChops.difference(expected.convert("RGBA"), actual.convert("RGBA"))

        red, green, blue, alpha = delta.split()
        changed = ImageChops.lighter(
            ImageChops.lighter(red, green), ImageChops.lighter(blue, alpha)
        ).point([0] + [255] * 255)
        count = changed.histogram()[255]
        if count:
            with args.diff.open("xb") as output:
                changed.save(output, format="PNG")
        print(f"{count}/{changed.width * changed.height} pixels differ")
        return int(count != 0)
    except ImportError:
        print("Run with a Python environment that provides Pillow", file=sys.stderr)
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        print(error, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
