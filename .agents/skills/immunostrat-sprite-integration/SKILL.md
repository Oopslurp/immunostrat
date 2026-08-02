---
name: immunostrat-sprite-integration
description: Prepare, clean, normalize, integrate, replace, or repair pixel-art spritesheets for Immunostrat's Phaser V11.3 pipeline. Use for spritesheet inspection or slicing, baked-checkerboard removal, animation-row replacement, migration from procedural rendering to sprites, and adding or correcting animations for units, tissue cells, pathogens, or effects.
---

# Immunostrat Sprite Integration

Integrate spritesheets through the existing V11.3 pipeline without changing simulation or gameplay.

## Non-negotiable invariants

- Never stretch a sprite or alter its aspect ratio.
- Use one scale across every frame of an entity; enlarge the transparent canvas when an action needs room.
- Preserve pixel art with nearest-neighbor sampling and no smoothing.
- Preserve the procedural fallback and keep selection, health, orders, debuffs, and VFX as separate overlays.
- Never infer transparency from a visible checkerboard. Inspect the actual alpha channel.
- Never ship labels or reference text inside Phaser frames.
- Report every gameplay visual state missing from the sheet, even when `idle` or the procedural renderer keeps the game functional.
- Do not invent mechanics, balance changes, events, timings, conditions, or consequences.

## Inspect the project first

Before editing, read the relevant current files rather than relying on this skill's examples:

- `src/game/phaser/assets/entitySpriteManifest.ts`
- `src/game/phaser/assets/preloadEntitySprites.ts`
- `src/game/phaser/scenes/PreloadScene.ts`
- `src/game/phaser/animations/registerEntityAnimations.ts`
- `src/game/phaser/rendering/entityVisualState.ts`
- `src/game/phaser/rendering/spriteResolver.ts`
- `src/game/phaser/scenes/MissionScene.ts`
- the target entity's simulation type, state transitions, procedural renderer, visual controller, tests, and debug viewer
- existing image scripts under `scripts/`

Read [references/project-pipeline.md](references/project-pipeline.md) for path roles, examples, and configuration patterns. Read [references/validation-and-report.md](references/validation-and-report.md) before final validation.

## Required workflow

### 1. Inspect the source

Run:

```powershell
python .agents/skills/immunostrat-sprite-integration/scripts/inspect_spritesheet.py `
  --input <source.png> --output <inspection.json>
```

If the normal Python lacks Pillow, use the bundled Python returned by the workspace dependency loader.

Confirm dimensions, image mode, real alpha, transparent-pixel count, dominant edge colors, likely baked checkerboard, labels, grid geometry, margins, spacing, clipping, overlaps, and proportion drift. Treat automatic checkerboard detection as a warning that still requires visual inspection.

### 2. Build a coverage matrix

Create:

- List A: animations visible in the sheet.
- List B: visual states and actions actually emitted by code.
- A coverage table mapping each code state to its animation, `idle` fallback, procedural fallback, or missing status.

Include applicable special states such as `phagocytosis`, `collect`, `carry`, `produce`, `infected`, `protected`, `rupture`, `dying`, and `special`. Explicitly report unused sheet animations and missing code hooks.

### 3. Prepare a per-asset configuration

Use a JSON configuration based on the examples in `references/`. Define explicit animation crop regions when labels or irregular spacing exist. A regular subdivision is acceptable only inside a verified label-free row region.

Choose background removal deliberately:

- `alpha`: preserve a genuine source alpha channel.
- `chroma-variance`: remove a baked grayscale checkerboard only when colored sprites do not rely on gray internal pixels.
- `key-color`: remove a known flat color.

Stop and report when deterministic removal damages outlines or interior colors. Do not silently accept halos or residual checkerboard pixels.

### 4. Normalize and preview

Run:

```powershell
python .agents/skills/immunostrat-sprite-integration/scripts/prepare_spritesheet.py `
  --input <source.png> --config <entity.json> `
  --output <production.png> --report <production.json> --preview <preview.png>
```

The script uses one scale, equal frame canvases, nearest-neighbor resizing, and a shared `center` or `bottom-center` alignment. Inspect the preview before integration. Prefer production assets under:

```text
public/assets/sprites/units/<entity>/
public/assets/sprites/tissue/<entity>/
public/assets/sprites/pathogens/<entity>/
public/assets/sprites/effects/<entity>/
```

Reuse project-specific scripts when they are a better fit. In particular, do not replace `scripts/extract_macrophage_sheet.py` or `scripts/replace_macrophage_animation_row.py` with a parallel macrophage pipeline.

### 5. Integrate centrally

- Add or update one `EntitySpriteDefinition` in the central manifest.
- Let `PreloadScene` and `registerEntityAnimations` load and register it.
- Route entity state through a pure visual-state adapter or a disposable visual controller.
- Keep simulation state authoritative; Phaser may observe it but must not mutate gameplay.
- Define stable anchor, visual offset, scale, orientation, frame ranges, frame rates, repeat rules, impact frame, and relevant attachment points.
- Do not restart the same animation each render frame.
- Lock one-shot animations according to entity-specific priorities, then return to real `move` or `idle`.
- Keep death terminal and clean listeners, tweens, sprites, and maps after destruction.

If an animation exists without a mechanic, it may be registered and exposed to a development viewer, but do not create the mechanic. If gameplay lacks a visual signal, add only the smallest read-only adapter needed to observe existing state.

### 6. Preserve fallback behavior

Validate both fallback layers:

1. Missing requested animation may resolve to the sprite's `idle` animation.
2. Disabled manifest entries, invalid definitions, or missing textures must keep the procedural renderer functional when `allowProceduralFallback` is true.

Do not hide missing coverage in the final report merely because either fallback works.

### 7. Validate

Run the bundled validator:

```powershell
python .agents/skills/immunostrat-sprite-integration/scripts/validate_spritesheet.py `
  --input <production.png> --config <entity.json> --report <validation.json>
```

Then run targeted asset, manifest, animation, mapping, controller, and fallback tests; the full test suite when reasonable; `npm run build`; and lint if the project adds one.

Playtest every available action, flip, selection overlay, health display, representative biological backgrounds, multiple instances, and destruction cleanup. Test every camera zoom the game actually supports; if only zoom `1` exists, record that limitation instead of inventing zoom modes.

## Final report

Use the exact checklist and report fields in [references/validation-and-report.md](references/validation-and-report.md). Lead with coverage gaps or unresolved quality risks. State which source was used, what was generated, the chosen scale and anchor, the fallback retained, tests run, and any gameplay state not represented by the sheet.
