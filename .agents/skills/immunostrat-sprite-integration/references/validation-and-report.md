# Validation checklist and report

## Final checklist

### Source and extraction

- Record source path, dimensions, mode, alpha extrema, and transparent-pixel count.
- Confirm labels, margins, spacing, and irregular grid regions were excluded.
- Confirm no baked checkerboard, white/gray halo, clipped appendage, or useful projectile remains outside the crop.
- Confirm interior colors and outlines were preserved.

### Normalization

- Confirm every frame has the same canvas dimensions.
- Confirm one aspect-preserving scale is used for all frames.
- Confirm the shared alignment and anchor do not create vertical jumps or idle drift.
- Confirm action extensions fit without clipping.
- Confirm RGBA output has real transparent pixels.

### Integration

- Validate the central manifest and unique texture/animation keys.
- Confirm nearest filtering, frame ranges, rates, repeat values, impact frames, and attachment points.
- Confirm one-shots are not restarted each frame.
- Confirm missing animation and missing texture behavior.
- Confirm procedural fallback, overlays, cleanup, and simulation immutability.

### Playtest

- Test idle, movement, every implemented action, hurt, death, and special states.
- Test horizontal flip when applicable.
- Test selection, health, orders, depth, representative backgrounds, multiple instances, and destruction.
- Test every zoom actually supported and report unsupported requested zoom levels.
- Check browser warnings/errors and visual screenshots.

## Coverage matrix template

| Code state/action | Sheet animation | Integration | Gap or fallback |
|---|---|---|---|
| idle | yes/no | loop/missing | none/idle/procedural |
| move | yes/no | loop/missing | none/idle/procedural |
| attack | yes/no | one-shot/missing | none/idle/procedural |
| hurt | yes/no | one-shot/missing | none/idle/procedural |
| death | yes/no | terminal/missing | none/procedural |
| entity-specific state | yes/no | describe | describe |

## Required final report

1. Source asset and detected dimensions/transparency.
2. Background treatment and evidence of clean alpha.
3. Grid or explicit crop regions.
4. Animations found in the sheet.
5. Visual states/actions found in code.
6. Coverage matrix.
7. Missing code states and unused sheet animations.
8. Generated production, metadata, preview, and configuration files.
9. Manifest changes and animation mapping.
10. Canvas, common scale, anchor, visual offset, and attachment points.
11. Idle and procedural fallback retained.
12. Tests, build, lint, and browser checks executed.
13. Remaining problems, unsupported validation conditions, and decisions needed.

Never report “complete” while omitting a known coverage gap merely because a fallback is available.
