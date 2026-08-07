#!/usr/bin/env python3
"""Prepare an Immunostrat spritesheet from explicit, label-free crop regions."""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--config", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--preview")
    return parser.parse_args()


def rectangle(value: list[int], label: str) -> tuple[int, int, int, int]:
    if len(value) != 4 or any(not isinstance(item, int) for item in value):
        raise SystemExit(f"{label} must contain four integers [x, y, width, height].")
    x, y, width, height = value
    if width <= 0 or height <= 0:
        raise SystemExit(f"{label} width and height must be positive.")
    return x, y, width, height


def expand_animation_frames(animation: dict[str, Any]) -> list[tuple[int, int, int, int]]:
    name = animation.get("name", "<unnamed>")
    if "frames" in animation:
        return [
            rectangle(value, f"{name}.frames[{index}]")
            for index, value in enumerate(animation["frames"])
        ]
    if "rowBox" not in animation or "columns" not in animation:
        raise SystemExit(f"{name} requires frames or rowBox plus columns.")
    x, y, width, height = rectangle(animation["rowBox"], f"{name}.rowBox")
    columns = int(animation["columns"])
    if columns <= 0:
        raise SystemExit(f"{name}.columns must be positive.")
    return [
        (
            round(x + column * width / columns),
            y,
            round(x + (column + 1) * width / columns)
            - round(x + column * width / columns),
            height,
        )
        for column in range(columns)
    ]


def colored_mask(image: Image.Image, threshold: int) -> Image.Image:
    rgb = image.convert("RGB")
    mask = Image.new("L", rgb.size, 0)
    source = rgb.load()
    target = mask.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            red, green, blue = source[x, y]
            if max(red, green, blue) - min(red, green, blue) >= threshold:
                target[x, y] = 255
    return mask


def key_color_mask(
    image: Image.Image,
    key_color: list[int],
    tolerance: int,
) -> Image.Image:
    if len(key_color) != 3:
        raise SystemExit("background.color must contain three RGB integers.")
    rgb = image.convert("RGB")
    mask = Image.new("L", rgb.size, 0)
    source = rgb.load()
    target = mask.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            pixel = source[x, y]
            if max(abs(pixel[index] - key_color[index]) for index in range(3)) > tolerance:
                target[x, y] = 255
    return mask


def remove_tiny_components(mask: Image.Image, minimum_size: int) -> Image.Image:
    if minimum_size <= 1:
        return mask
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


def fill_enclosed_holes(mask: Image.Image) -> Image.Image:
    """Keep pale sprite interiors while leaving border-connected background clear."""
    width, height = mask.size
    source = mask.load()
    outside: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        for y in (0, height - 1):
            if source[x, y] == 0 and (x, y) not in outside:
                outside.add((x, y))
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if source[x, y] == 0 and (x, y) not in outside:
                outside.add((x, y))
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if (
                0 <= nx < width
                and 0 <= ny < height
                and source[nx, ny] == 0
                and (nx, ny) not in outside
            ):
                outside.add((nx, ny))
                queue.append((nx, ny))

    output = mask.copy()
    target = output.load()
    for y in range(height):
        for x in range(width):
            if source[x, y] == 0 and (x, y) not in outside:
                target[x, y] = 255
    return output


def build_mask(image: Image.Image, background: dict[str, Any]) -> Image.Image:
    mode = background.get("mode", "alpha")
    if mode == "alpha":
        if "A" not in image.getbands():
            raise SystemExit("background.mode alpha requires a real source alpha channel.")
        return image.getchannel("A")
    if mode == "chroma-variance":
        mask = colored_mask(image, int(background.get("threshold", 12)))
        mask = remove_tiny_components(
            mask,
            int(background.get("minimumComponentSize", 1)),
        )
        return (
            fill_enclosed_holes(mask)
            if bool(background.get("fillEnclosedHoles", False))
            else mask
        )
    if mode == "key-color":
        return key_color_mask(
            image,
            background.get("color", []),
            int(background.get("tolerance", 0)),
        )
    raise SystemExit(f"Unsupported background mode: {mode}.")


def despill_green(image: Image.Image, threshold: int) -> Image.Image:
    """Clamp dominant green chroma spill without changing alpha or aspect ratio."""
    output = image.copy()
    pixels = output.load()
    for y in range(output.height):
        for x in range(output.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha > 0 and green > red + threshold and green > blue + threshold:
                pixels[x, y] = (red, (red + blue) // 2, blue, alpha)
    return output


def checkerboard(width: int, height: int, tile: int = 8) -> Image.Image:
    image = Image.new("RGBA", (width, height), (242, 244, 247, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, height, tile):
        for x in range(0, width, tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle(
                    (x, y, x + tile - 1, y + tile - 1),
                    fill=(214, 219, 225, 255),
                )
    return image


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    config_path = Path(args.config)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    source = Image.open(input_path)
    source_rgba = source.convert("RGBA")
    frame_width, frame_height = config.get("frameSize", [0, 0])
    padding = int(config.get("padding", 0))
    alignment = config.get("alignment", "bottom-center")
    if frame_width <= 0 or frame_height <= 0:
        raise SystemExit("frameSize must contain positive width and height.")
    if padding < 0 or padding * 2 >= min(frame_width, frame_height):
        raise SystemExit("padding is invalid for the configured frame size.")
    if alignment not in {"center", "bottom-center"}:
        raise SystemExit("alignment must be center or bottom-center.")

    animations = config.get("animations", [])
    if not animations:
        raise SystemExit("At least one animation is required.")
    names = [animation.get("name") for animation in animations]
    if any(not name for name in names) or len(set(names)) != len(names):
        raise SystemExit("Animation names must be present and unique.")

    background = config.get("background", {"mode": "alpha"})
    despill = config.get("despill", {})
    despill_animations = set(despill.get("animations", []))
    despill_threshold = int(despill.get("threshold", 12))
    extracted_rows: list[list[Image.Image]] = []
    frame_metadata: list[dict[str, Any]] = []
    maximum_width = 0
    maximum_height = 0
    for animation in animations:
        row: list[Image.Image] = []
        for index, (x, y, width, height) in enumerate(expand_animation_frames(animation)):
            if x < 0 or y < 0 or x + width > source.width or y + height > source.height:
                raise SystemExit(f"{animation['name']} frame {index} exceeds source bounds.")
            slot = source_rgba.crop((x, y, x + width, y + height))
            mask = build_mask(
                source.crop((x, y, x + width, y + height)),
                background,
            )
            bounds = mask.getbbox()
            if bounds is None:
                raise SystemExit(f"{animation['name']} frame {index} is empty.")
            slot.putalpha(mask)
            if despill.get("mode") == "green" and animation["name"] in despill_animations:
                slot = despill_green(slot, despill_threshold)
            content = slot.crop(bounds)
            maximum_width = max(maximum_width, content.width)
            maximum_height = max(maximum_height, content.height)
            row.append(content)
            frame_metadata.append(
                {
                    "animation": animation["name"],
                    "index": index,
                    "sourceRect": [x, y, width, height],
                    "contentBounds": list(bounds),
                    "contentSize": [content.width, content.height],
                }
            )
        extracted_rows.append(row)

    available_width = frame_width - padding * 2
    available_height = frame_height - padding * 2
    calculated_scale = min(
        available_width / maximum_width,
        available_height / maximum_height,
    )
    allow_upscale = bool(config.get("allowUpscale", False))
    scale = float(config.get("scale", calculated_scale))
    if not allow_upscale:
        scale = min(scale, 1.0)
    if scale <= 0:
        raise SystemExit("The common scale must be positive.")
    if maximum_width * scale > frame_width or maximum_height * scale > frame_height:
        raise SystemExit("Content does not fit the canvas at the configured common scale.")

    columns = max(len(row) for row in extracted_rows)
    sheet = Image.new(
        "RGBA",
        (columns * frame_width, len(extracted_rows) * frame_height),
        (0, 0, 0, 0),
    )
    output_frames: list[Image.Image] = []
    animation_report: list[dict[str, Any]] = []
    metadata_index = 0
    for row_index, (animation, row) in enumerate(zip(animations, extracted_rows)):
        start_frame = row_index * columns
        for column, content in enumerate(row):
            width = max(1, round(content.width * scale))
            height = max(1, round(content.height * scale))
            resized = content.resize((width, height), Image.Resampling.NEAREST)
            canvas = Image.new("RGBA", (frame_width, frame_height), (0, 0, 0, 0))
            offset_x = (frame_width - width) // 2
            offset_y = (
                (frame_height - height) // 2
                if alignment == "center"
                else frame_height - padding - height
            )
            if offset_x < 0 or offset_y < 0:
                raise SystemExit(f"{animation['name']} frame {column} clips the canvas.")
            canvas.alpha_composite(resized, (offset_x, offset_y))
            sheet.alpha_composite(
                canvas,
                (column * frame_width, row_index * frame_height),
            )
            output_frames.append(canvas)
            frame_metadata[metadata_index]["outputBounds"] = [
                offset_x,
                offset_y,
                width,
                height,
            ]
            frame_metadata[metadata_index]["sheetFrame"] = start_frame + column
            metadata_index += 1
        animation_report.append(
            {
                "name": animation["name"],
                "startFrame": start_frame,
                "endFrame": start_frame + len(row) - 1,
                "frameRate": animation.get("frameRate"),
                "repeat": animation.get("repeat"),
            }
        )

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)

    if args.preview:
        preview_scale = 3
        preview = checkerboard(
            sheet.width * preview_scale,
            sheet.height * preview_scale,
        )
        preview.alpha_composite(
            sheet.resize(preview.size, Image.Resampling.NEAREST)
        )
        preview_path = Path(args.preview)
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        preview.save(preview_path)

    report = {
        "entityType": config.get("entityType"),
        "source": str(input_path),
        "sourceSize": [source.width, source.height],
        "sourceMode": source.mode,
        "background": background,
        "despill": despill,
        "output": str(output_path),
        "outputSize": list(sheet.size),
        "frameSize": [frame_width, frame_height],
        "columns": columns,
        "rows": len(extracted_rows),
        "frameCount": columns * len(extracted_rows),
        "contentFrameCount": sum(len(row) for row in extracted_rows),
        "padding": padding,
        "alignment": alignment,
        "commonScale": scale,
        "animations": animation_report,
        "frames": frame_metadata,
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "frames"}, indent=2))


if __name__ == "__main__":
    main()
