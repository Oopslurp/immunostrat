#!/usr/bin/env python3
"""Validate production dimensions, alpha, frame occupancy, and clipping risk."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--config", required=True)
    parser.add_argument("--report", required=True)
    return parser.parse_args()


def animation_frame_count(animation: dict[str, object]) -> int:
    if "frames" in animation:
        return len(animation["frames"])  # type: ignore[arg-type]
    return int(animation.get("columns", 0))


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    image = Image.open(input_path).convert("RGBA")
    frame_width, frame_height = config.get("frameSize", [0, 0])
    animations = config.get("animations", [])
    counts = [animation_frame_count(animation) for animation in animations]
    columns = max(counts, default=0)
    expected_size = (columns * frame_width, len(animations) * frame_height)
    errors: list[str] = []
    warnings: list[str] = []

    if image.size != expected_size:
        errors.append(f"Output size {image.size} does not match expected {expected_size}.")
    alpha = image.getchannel("A")
    alpha_extrema = alpha.getextrema()
    transparent_pixels = image.width * image.height - alpha.histogram()[255]
    if transparent_pixels == 0:
        errors.append("Production sheet has no transparent pixels.")

    frame_results: list[dict[str, object]] = []
    for row_index, count in enumerate(counts):
        for column in range(count):
            box = (
                column * frame_width,
                row_index * frame_height,
                (column + 1) * frame_width,
                (row_index + 1) * frame_height,
            )
            frame_alpha = alpha.crop(box)
            bounds = frame_alpha.getbbox()
            label = f"{animations[row_index].get('name')}[{column}]"
            if bounds is None:
                errors.append(f"{label} is empty.")
                frame_results.append({"frame": label, "bounds": None})
                continue
            touches_edge = (
                bounds[0] == 0
                or bounds[1] == 0
                or bounds[2] == frame_width
                or bounds[3] == frame_height
            )
            if touches_edge:
                warnings.append(f"{label} touches a canvas edge; inspect for clipping.")
            frame_results.append(
                {
                    "frame": label,
                    "bounds": list(bounds),
                    "touchesEdge": touches_edge,
                }
            )

    report = {
        "input": str(input_path),
        "size": list(image.size),
        "mode": image.mode,
        "alphaExtrema": list(alpha_extrema),
        "transparentPixelCount": transparent_pixels,
        "errors": errors,
        "warnings": warnings,
        "frames": frame_results,
        "valid": not errors,
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
