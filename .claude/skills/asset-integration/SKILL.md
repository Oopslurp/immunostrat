---
name: asset-integration
description: Integrate AI-generated (ChatGPT) art assets into the Immunostrat Phaser/React game. Use whenever a new image is provided to add to the game — units, pathogens, tiles, HUD elements, VFX, backgrounds. Covers cleanup, palette conformity, resizing, spritesheet slicing, and pipeline wiring. A background image must not replace the seed-based generated map. It can only become a decorative layer, chunk, tile, overlay, or deterministic visual asset compatible with the generated map.
---

# Asset Integration — Immunostrat

## Role split
- ChatGPT produces the *raw concept image* — treat it as a starting or medium point, not a final asset.
- Claude Code (Fable 5 or other strong models) is responsible for making the asset **game-ready**, including artistic touch-ups when NEEDED. Do not just drop the raw file in and call it done.

## Allowed touch-ups (do these proactively when needed)
- Snap colors to the project palette (see `pixel-art-style-guide` skill / palette file/ the other skill) — reduce/remap colors if ChatGPT output drifts from the approved palette.
- Clean up anti-aliasing / blur into crisp pixel edges if the asset is meant to be pixel-art.
- Resize/rescale to the correct tile or sprite grid (state exact target size in the style guide, e.g. 32x32, 64x64).
- Fix silhouette clarity issues (unit not readable at gameplay zoom) — simplify shapes if needed, boost contrast, adjust outline.
- Remove/replace background, fix transparency (alpha channel clean edges, no halo).
- Adjust proportions slightly to match existing unit scale/consistency (e.g. if a new pathogen looks too big/small vs established sprites).
- Minor recoloring for team/faction variants, health states, or animation frame consistency.

## Not allowed without asking
- Full redesign of a silhouette/concept that changes what the unit visually represents.
- Introducing new palette colors not in the approved set (extend the palette file first, then use it consistently).
- Changing established visual language (e.g. antibody shape, cytokine color coding) once locked in a prior version pass.

## Workflow
1. Receive raw image (path or upload).
2. Check against style guide: palette, target resolution, grid size, silhouette rules.
3. Apply corrections (script or manual edit) — document what was changed and why in the commit/PR description.
4. Slice into spritesheet if it's an animated unit (idle/move/attack/hurt/death frames) following existing atlas naming convention.
5. Place in the correct asset folder, update the Phaser atlas/manifest, wire into React/Phaser loading code.
6. Do a visual sanity check at actual in-game zoom level before considering it done.

## Notes
Fill in with actual project specifics once available: exact palette hex codes, asset folder structure, Phaser atlas format in use, naming convention for animation frames.
ne pas toucher au gameplay ;
ne pas modifier la génération seed ;
ne pas modifier le pathfinding ;
ne pas changer les metadata V11 ;
ne pas transformer une image de background en carte fixe