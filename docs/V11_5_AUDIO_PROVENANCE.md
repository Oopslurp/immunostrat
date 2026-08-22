# Immunostrat V11.5 — Audio provenance

All V11.5 sounds are original procedural synthesis generated locally at runtime
by `src/audio/AudioDirector.ts`. No downloaded samples, music tracks, external
sound libraries, or third-party audio assets are included.

## Generator

- Engine: Web Audio API
- Source: square, triangle and saw oscillators; deterministic filtered-noise
  buffer; quantized wave shaping; stepped pitch; micro-crackle envelopes;
  low-frequency modulation and restrained stereo panning
- Noise seed: `0x1155`
- Ownership: original Immunostrat project code
- License: same repository license

## Sound families

- UI: hover, confirmation, back, invalid, pause, resume
- Orders: selection, focus, movement, engagement, special action
- Immune response: arrival, phagocytosis, NET, NK, T cytotoxic, antibody,
  dendritic collection, lymphatic delivery
- Threats: combat contact, infection, pathogen clearance, biofilm, wave alert
- Results: victory and defeat
- Continuous layers: low biological drone, original minor-pentatonic ambient
  phrases, cell-bell voices, membrane bass and restrained resonant echoes

The ambient score uses original deterministic motifs written for Immunostrat.
Its spacious pacing evokes calm exploration music, while its notes and melodic
phrases do not reproduce any third-party composition. Quantized harmonics and a
slow membrane modulation keep the score pixel-like and biological.

## Runtime safety

The mix uses one lazily unlocked `AudioContext`, MASTER/MUSIC/AMBIENCE/SFX/UI
gain groups, persistent normalized settings, visibility suspension, pause
ducking, per-family cooldowns and a maximum of 16 transient voices. Phaser audio
is disabled to prevent a second context.
