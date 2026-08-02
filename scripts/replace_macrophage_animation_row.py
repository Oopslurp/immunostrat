#!/usr/bin/env python3
"""Replace one macrophage animation row without touching the other shipped rows."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

from extract_macrophage_sheet import ROWS, extract_frames, save_previews


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--sheet", required=True)
    parser.add_argument("--row", required=True, choices=ROWS)
    parser.add_argument("--preview-dir")
    parser.add_argument("--chroma-threshold", type=int, default=12)
    parser.add_argument("--minimum-component-size", type=int, default=8)
    return parser.parse_args()


def normalize_at_scale(
    frames: list[Image.Image],
    frame_size: int,
    padding: int,
    scale: float,
) -> list[Image.Image]:
    normalized: list[Image.Image] = []
    for index, frame in enumerate(frames):
        width = max(1, round(frame.width * scale))
        height = max(1, round(frame.height * scale))
        if width > frame_size or height + padding > frame_size:
            raise SystemExit(
                f"Frame {index} does not fit at the shipped scale: "
                f"{width}x{height} in {frame_size}x{frame_size}."
            )
        resized = frame.resize((width, height), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
        offset_x = (frame_size - width) // 2
        offset_y = frame_size - padding - height
        canvas.alpha_composite(resized, (offset_x, offset_y))
        normalized.append(canvas)
    return normalized


def split_sheet(sheet: Image.Image, frame_size: int) -> list[Image.Image]:
    return [
        sheet.crop(
            (
                (index % 8) * frame_size,
                (index // 8) * frame_size,
                (index % 8 + 1) * frame_size,
                (index // 8 + 1) * frame_size,
            )
        )
        for index in range(48)
    ]


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    sheet_path = Path(args.sheet)
    metadata_path = sheet_path.with_suffix(".json")

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    frame_size = int(metadata["frameSize"][0])
    padding = int(metadata["padding"])
    scale = float(metadata["normalizationScale"])
    row_index = ROWS.index(args.row)

    source = Image.open(input_path)
    extracted, extracted_metadata = extract_frames(
        source,
        args.chroma_threshold,
        args.minimum_component_size,
    )
    row_start = row_index * 8
    row_end = row_start + 8
    replacement_frames = normalize_at_scale(
        extracted[row_start:row_end],
        frame_size,
        padding,
        scale,
    )

    sheet = Image.open(sheet_path).convert("RGBA")
    expected_size = (frame_size * 8, frame_size * 6)
    if sheet.size != expected_size:
        raise SystemExit(
            f"Unexpected base sheet size {sheet.size}; expected {expected_size}."
        )

    clear_row = Image.new(
        "RGBA",
        (frame_size * 8, frame_size),
        (0, 0, 0, 0),
    )
    sheet.paste(clear_row, (0, row_index * frame_size))
    for column, frame in enumerate(replacement_frames):
        sheet.alpha_composite(
            frame,
            (column * frame_size, row_index * frame_size),
        )
    sheet.save(sheet_path)

    original_source = metadata.get("source")
    row_sources = metadata.setdefault(
        "rowSources",
        {row_name: original_source for row_name in ROWS},
    )
    row_sources[args.row] = str(input_path)
    metadata["frames"][row_start:row_end] = extracted_metadata[row_start:row_end]
    metadata.setdefault("rowReplacements", {})[args.row] = {
        "source": str(input_path),
        "sourceSize": list(source.size),
        "normalizationScale": scale,
    }
    metadata_path.write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    if args.preview_dir:
        save_previews(
            split_sheet(sheet, frame_size),
            Path(args.preview_dir),
            frame_size,
        )

    print(
        json.dumps(
            {
                "sheet": str(sheet_path),
                "replacedRow": args.row,
                "source": str(input_path),
                "frameSize": frame_size,
                "normalizationScale": scale,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
