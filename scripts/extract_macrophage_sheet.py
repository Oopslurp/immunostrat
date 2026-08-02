#!/usr/bin/env python3
"""Extract the V11.3B macrophage presentation board into a game spritesheet."""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROWS = ("idle", "move", "attack", "phagocytosis", "hurt", "death")
REFERENCE_SIZE = (1448, 1086)
REFERENCE_ROW_BANDS = (
    (45, 180),
    (222, 350),
    (396, 522),
    (564, 695),
    (738, 865),
    (920, 1065),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--preview-dir")
    parser.add_argument("--frame-size", type=int, default=64)
    parser.add_argument("--padding", type=int, default=4)
    parser.add_argument("--chroma-threshold", type=int, default=12)
    parser.add_argument("--minimum-component-size", type=int, default=8)
    return parser.parse_args()


def colored_mask(image: Image.Image, threshold: int) -> Image.Image:
    rgb = image.convert("RGB")
    mask = Image.new("L", rgb.size, 0)
    source = rgb.load()
    target = mask.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            pixel = source[x, y]
            if max(pixel) - min(pixel) >= threshold:
                target[x, y] = 255
    return mask


def remove_tiny_components(mask: Image.Image, minimum_size: int) -> Image.Image:
    width, height = mask.size
    source = mask.load()
    output = Image.new("L", mask.size, 0)
    target = output.load()
    visited: set[tuple[int, int]] = set()

    for start_y in range(height):
        for start_x in range(width):
            start = (start_x, start_y)
            if start in visited or source[start_x, start_y] == 0:
                continue
            queue = deque([start])
            visited.add(start)
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    nx, ny = neighbor
                    if (
                        0 <= nx < width
                        and 0 <= ny < height
                        and neighbor not in visited
                        and source[nx, ny] != 0
                    ):
                        visited.add(neighbor)
                        queue.append(neighbor)
            if len(component) >= minimum_size:
                for x, y in component:
                    target[x, y] = 255
    return output


def extract_frames(
    source: Image.Image,
    chroma_threshold: int,
    minimum_component_size: int,
) -> tuple[list[Image.Image], list[dict[str, object]]]:
    width, height = source.size
    scale_x = width / REFERENCE_SIZE[0]
    scale_y = height / REFERENCE_SIZE[1]
    frames: list[Image.Image] = []
    metadata: list[dict[str, object]] = []

    for row_index, row_name in enumerate(ROWS):
        reference_top, reference_bottom = REFERENCE_ROW_BANDS[row_index]
        top = round(reference_top * scale_y)
        bottom = round(reference_bottom * scale_y)
        for column in range(8):
            left = round(column * width / 8)
            right = round((column + 1) * width / 8)
            slot = source.crop((left, top, right, bottom)).convert("RGBA")
            mask = remove_tiny_components(
                colored_mask(slot, chroma_threshold),
                minimum_component_size,
            )
            bbox = mask.getbbox()
            if bbox is None:
                raise SystemExit(f"No sprite detected at row {row_index}, column {column}.")
            transparent = slot.copy()
            transparent.putalpha(mask)
            frame = transparent.crop(bbox)
            frames.append(frame)
            metadata.append(
                {
                    "row": row_name,
                    "column": column,
                    "sourceSlot": [left, top, right, bottom],
                    "contentBoundsInSlot": list(bbox),
                    "contentSize": list(frame.size),
                }
            )
    return frames, metadata


def normalize_frames(
    frames: list[Image.Image],
    frame_size: int,
    padding: int,
) -> tuple[list[Image.Image], float]:
    available = frame_size - padding * 2
    maximum_width = max(frame.width for frame in frames)
    maximum_height = max(frame.height for frame in frames)
    scale = min(available / maximum_width, available / maximum_height)
    normalized: list[Image.Image] = []

    for frame in frames:
        width = max(1, round(frame.width * scale))
        height = max(1, round(frame.height * scale))
        resized = frame.resize((width, height), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
        offset_x = (frame_size - width) // 2
        offset_y = frame_size - padding - height
        canvas.alpha_composite(resized, (offset_x, offset_y))
        normalized.append(canvas)
    return normalized, scale


def save_sheet(frames: list[Image.Image], output_path: Path, frame_size: int) -> None:
    sheet = Image.new("RGBA", (frame_size * 8, frame_size * 6), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(
            frame,
            ((index % 8) * frame_size, (index // 8) * frame_size),
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)


def checkerboard(size: int, tile: int = 8) -> Image.Image:
    image = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    colors = ((239, 241, 244, 255), (214, 219, 225, 255))
    for y in range(0, size, tile):
        for x in range(0, size, tile):
            draw.rectangle(
                (x, y, x + tile - 1, y + tile - 1),
                fill=colors[(x // tile + y // tile) % 2],
            )
    return image


def save_previews(frames: list[Image.Image], preview_dir: Path, frame_size: int) -> None:
    preview_dir.mkdir(parents=True, exist_ok=True)
    enlarged_size = frame_size * 3
    board = checkerboard(enlarged_size * 8)
    board = board.crop((0, 0, enlarged_size * 8, enlarged_size * 6))
    for index, frame in enumerate(frames):
        enlarged = frame.resize((enlarged_size, enlarged_size), Image.Resampling.NEAREST)
        board.alpha_composite(
            enlarged,
            ((index % 8) * enlarged_size, (index // 8) * enlarged_size),
        )
    board.save(preview_dir / "macrophage-contact-sheet.png")

    frame_rates = (7, 10, 12, 10, 14, 9)
    for row_index, row_name in enumerate(ROWS):
        animation_frames: list[Image.Image] = []
        for frame in frames[row_index * 8 : row_index * 8 + 8]:
            background = checkerboard(enlarged_size)
            enlarged = frame.resize((enlarged_size, enlarged_size), Image.Resampling.NEAREST)
            background.alpha_composite(enlarged)
            animation_frames.append(background.convert("P", palette=Image.Palette.ADAPTIVE))
        animation_frames[0].save(
            preview_dir / f"macrophage-{row_name}.gif",
            save_all=True,
            append_images=animation_frames[1:],
            duration=round(1000 / frame_rates[row_index]),
            loop=0,
            disposal=2,
        )


def main() -> None:
    args = parse_args()
    if args.frame_size <= args.padding * 2:
        raise SystemExit("Frame size must be larger than twice the padding.")

    source = Image.open(args.input)
    frames, metadata = extract_frames(
        source,
        args.chroma_threshold,
        args.minimum_component_size,
    )
    normalized, normalization_scale = normalize_frames(
        frames,
        args.frame_size,
        args.padding,
    )
    output_path = Path(args.output)
    save_sheet(normalized, output_path, args.frame_size)
    if args.preview_dir:
        save_previews(normalized, Path(args.preview_dir), args.frame_size)

    report = {
        "source": str(Path(args.input)),
        "sourceSize": list(source.size),
        "output": str(output_path),
        "outputSize": [args.frame_size * 8, args.frame_size * 6],
        "frameSize": [args.frame_size, args.frame_size],
        "columns": 8,
        "rows": 6,
        "frameCount": 48,
        "margin": 0,
        "spacing": 0,
        "anchor": "bottom-center",
        "padding": args.padding,
        "chromaThreshold": args.chroma_threshold,
        "normalizationScale": normalization_scale,
        "frames": metadata,
    }
    output_path.with_suffix(".json").write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({key: value for key, value in report.items() if key != "frames"}, indent=2))


if __name__ == "__main__":
    main()
