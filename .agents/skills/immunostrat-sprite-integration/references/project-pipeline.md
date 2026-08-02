# Immunostrat sprite pipeline reference

## Current V11.3 architecture

| File | Responsibility |
|---|---|
| `src/game/phaser/assets/entitySpriteManifest.ts` | Asset definitions, animation ranges, anchor, offset, scale, orientation, attachment points, validation |
| `src/game/phaser/assets/preloadEntitySprites.ts` | Manifest-driven image, spritesheet, and atlas loading |
| `src/game/phaser/scenes/PreloadScene.ts` | Calls the central preload and animation registration |
| `src/game/phaser/animations/registerEntityAnimations.ts` | Registers animation keys once and forces nearest filtering |
| `src/game/phaser/rendering/entityVisualState.ts` | Pure mapping from simulation state to generic visual state |
| `src/game/phaser/rendering/spriteResolver.ts` | Resolves sprites and animations, then idle or procedural fallback |
| `src/game/phaser/scenes/MissionScene.ts` | Keeps procedural drawing and overlays; delegates active sprite rendering |

`createPhaserConfig.ts` currently uses `pixelArt: true` and `antialias: false`. Do not add a second loader, registry, or resolver.

## Macrophage example

The shipped macrophage demonstrates the complete pattern:

- production asset: `public/assets/sprites/units/macrophage/unit_macrophage.png`
- 8 columns × 6 rows, 64 × 64 frames, bottom-center alignment
- states: idle, move, attack, phagocytosis, hurt, death
- controller: `MacrophageVisualController.ts`
- state arbitration: `macrophageVisualState.ts`
- development viewer: `MacrophageDebugViewer.ts`
- procedural fallback remains in `MissionScene`
- selection and health overlays remain above the sprite
- phagocytosis observes existing simulation fields and does not change gameplay

Use `scripts/extract_macrophage_sheet.py` for the approved macrophage board format. Use `scripts/replace_macrophage_animation_row.py` for an isolated row replacement at the shipped scale. These scripts are asset-specific by design.

## Tissue-cell example

Before integrating a tissue-cell sheet, compare its rows to `TissueCellState` and the current tissue renderer. A typical coverage matrix is:

| Code state | Expected animation | Rule |
|---|---|---|
| healthy | healthy or idle | Loop |
| infected | infected | Loop; do not invent infection timing |
| destroyed | destroyed or death | One-shot or terminal pose |
| interferon protected | protected overlay or animation | Only if the existing gameplay exposes this state |

If a sheet contains `INTERFERON` but the renderer has no stable signal, register the animation only when useful and report the missing hook. Do not create protection mechanics. Keep health, infection markers, targeting, and generic effects separate unless the sheet explicitly represents the biological state itself.

## Configuration schema

Use either explicit frame rectangles or a verified row rectangle:

```json
{
  "entityType": "exampleEntity",
  "frameSize": [64, 64],
  "padding": 4,
  "alignment": "bottom-center",
  "background": { "mode": "alpha" },
  "animations": [
    {
      "name": "idle",
      "rowBox": [0, 40, 1024, 128],
      "columns": 8,
      "frameRate": 8,
      "repeat": -1
    },
    {
      "name": "special",
      "frames": [[10, 210, 110, 118], [132, 208, 116, 120]],
      "frameRate": 10,
      "repeat": 0
    }
  ]
}
```

Rectangle format is `[x, y, width, height]`. `rowBox` must exclude labels and is divided only within that verified region. See `macrophage.example.json` and `tissue-cell.example.json`.

Background modes:

- `alpha`: use the source alpha channel.
- `chroma-variance`: keep pixels whose RGB channel variance exceeds `threshold`; optionally remove connected components smaller than `minimumComponentSize`.
- `key-color`: make pixels within `tolerance` of `color` transparent.

The generic preparer intentionally refuses empty frames and content that cannot fit the configured canvas at one common scale.
