#!/usr/bin/env python3
"""Append one normalized 8-frame row to the shipped tissue-cell spritesheet."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--row", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--keep-rows", type=int)
    args = parser.parse_args()

    base = Image.open(args.base).convert("RGBA")
    row = Image.open(args.row).convert("RGBA")
    if base.width != row.width or row.height != 64 or base.width % 64:
        raise SystemExit("Expected a matching 64 px-high normalized row.")

    kept_height = (args.keep_rows * 64) if args.keep_rows is not None else base.height
    if kept_height <= 0 or kept_height > base.height:
        raise SystemExit("--keep-rows exceeds the base sheet.")
    base = base.crop((0, 0, base.width, kept_height))
    combined = Image.new("RGBA", (base.width, base.height + row.height))
    combined.alpha_composite(base, (0, 0))
    combined.alpha_composite(row, (0, base.height))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    combined.save(output)
    print(f"Appended {row.width}x{row.height} row -> {combined.width}x{combined.height}")


if __name__ == "__main__":
    main()
