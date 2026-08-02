"""Stack the two normalized dendritic sprite outputs into one production sheet."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--main-sheet", required=True)
    parser.add_argument("--main-report", required=True)
    parser.add_argument("--carry-sheet", required=True)
    parser.add_argument("--carry-report", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()

    main_sheet = Image.open(args.main_sheet).convert("RGBA")
    carry_sheet = Image.open(args.carry_sheet).convert("RGBA")
    if main_sheet.width != carry_sheet.width:
        raise ValueError("Normalized sheets must have the same width.")

    output = Image.new(
        "RGBA",
        (main_sheet.width, main_sheet.height + carry_sheet.height),
        (0, 0, 0, 0),
    )
    output.alpha_composite(main_sheet, (0, 0))
    output.alpha_composite(carry_sheet, (0, main_sheet.height))

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output.save(output_path)

    with open(args.main_report, encoding="utf-8") as handle:
        main_report = json.load(handle)
    with open(args.carry_report, encoding="utf-8") as handle:
        carry_report = json.load(handle)

    animations = []
    frame_offset = main_report["frameCount"]
    for animation in main_report["animations"]:
        animations.append(animation)
    for animation in carry_report["animations"]:
        shifted = dict(animation)
        shifted["startFrame"] += frame_offset
        shifted["endFrame"] += frame_offset
        animations.append(shifted)

    report = {
        "entityType": "dendriticCell",
        "sourceImages": [
            main_report.get("source"),
            carry_report.get("source"),
        ],
        "outputImage": str(output_path),
        "frameSize": main_report["frameSize"],
        "columns": main_report["columns"],
        "rows": main_report["rows"] + carry_report["rows"],
        "frameCount": main_report["frameCount"] + carry_report["frameCount"],
        "animations": animations,
        "transparentPixelCount": output.getchannel("A").histogram()[0],
        "alphaBounds": output.getbbox(),
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
