#!/usr/bin/env python3
"""Inspect a spritesheet without assuming that a visible checkerboard is alpha."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output")
    return parser.parse_args()


def edge_pixels(image: Image.Image) -> list[tuple[int, int, int]]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    edge: list[tuple[int, int, int]] = []
    for x in range(width):
        edge.append(pixels[x, 0])
        if height > 1:
            edge.append(pixels[x, height - 1])
    for y in range(1, max(1, height - 1)):
        edge.append(pixels[0, y])
        if width > 1:
            edge.append(pixels[width - 1, y])
    return edge


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    image = Image.open(input_path)
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    alpha_extrema = alpha.getextrema()
    total_pixels = image.width * image.height
    transparent_pixels = total_pixels - alpha.histogram()[255]
    edges = edge_pixels(image)
    edge_counts = Counter(edges)
    grayscale_edges = sum(
        count
        for (red, green, blue), count in edge_counts.items()
        if max(red, green, blue) - min(red, green, blue) <= 5
    )
    grayscale_edge_ratio = grayscale_edges / max(1, len(edges))
    dominant_edges = [
        {"rgb": list(color), "count": count}
        for color, count in edge_counts.most_common(8)
    ]
    dominant_gray_count = sum(
        1
        for item in dominant_edges[:4]
        if max(item["rgb"]) - min(item["rgb"]) <= 5
    )
    has_alpha_channel = "A" in image.getbands()
    likely_baked_checkerboard = (
        transparent_pixels == 0
        and grayscale_edge_ratio >= 0.65
        and dominant_gray_count >= 2
    )

    report = {
        "input": str(input_path),
        "format": image.format,
        "mode": image.mode,
        "bands": list(image.getbands()),
        "size": [image.width, image.height],
        "pixelCount": total_pixels,
        "hasAlphaChannel": has_alpha_channel,
        "alphaExtrema": list(alpha_extrema),
        "transparentPixelCount": transparent_pixels,
        "transparentPixelRatio": transparent_pixels / max(1, total_pixels),
        "grayscaleEdgeRatio": grayscale_edge_ratio,
        "dominantEdgeColors": dominant_edges,
        "likelyBakedCheckerboard": likely_baked_checkerboard,
        "manualChecksRequired": [
            "labels and reference text",
            "animation rows and frame counts",
            "margins, spacing, and irregular grid regions",
            "clipped or overlapping content",
            "proportion and design drift",
            "halos and interior colors close to the background",
        ],
    }
    serialized = json.dumps(report, indent=2)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(serialized, encoding="utf-8")
    print(serialized)


if __name__ == "__main__":
    main()
