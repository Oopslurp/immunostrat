export type CellularMusicScene = "menu" | "game";

export type CellularMusicNote = Readonly<{
  frequency: number;
  offsetSeconds: number;
  durationSeconds: number;
  gain: number;
  pan: number;
  timbre: "cell-bell" | "membrane";
}>;

export type CellularMusicPhrase = Readonly<{
  intervalMs: number;
  notes: readonly CellularMusicNote[];
}>;

const D3_FREQUENCY = 146.83;
const D_MINOR_PENTATONIC_SEMITONES = [0, 3, 5, 7, 10, 12, 15, 17] as const;

const MENU_MOTIFS = [
  [0, 3, 5, 2],
  [1, 4, 6, 3],
  [0, 2, 4, 1],
] as const;

const GAME_MOTIFS = [
  [0, 2, 4, 3, 1],
  [1, 3, 5, 2, 4],
  [0, 4, 3, 6, 2],
  [2, 1, 5, 3, 0],
] as const;

/**
 * Builds an original, deterministic ambient phrase. The wide rests and bell-like
 * intervals keep the mix calm, while the low membrane voice gives it a cellular
 * pulse without reproducing any existing composition.
 */
export function createCellularMusicPhrase(
  scene: CellularMusicScene,
  phraseIndex: number,
): CellularMusicPhrase {
  const motifs = scene === "menu" ? MENU_MOTIFS : GAME_MOTIFS;
  const safeIndex = Math.max(0, Math.floor(phraseIndex));
  const motif = motifs[safeIndex % motifs.length];
  const stepSeconds = scene === "menu" ? 2.25 : 1.45;
  const melodyGain = scene === "menu" ? 0.17 : 0.15;
  const registerOffset = safeIndex % 3 === 2 ? 1 : 0;

  const melody = motif.map((scaleDegree, noteIndex) => ({
    frequency: scaleFrequency(scaleDegree + registerOffset),
    offsetSeconds: 0.45 + noteIndex * stepSeconds,
    durationSeconds:
      scene === "menu" ? 3.4 - (noteIndex % 2) * 0.35 : 2.45 + (noteIndex % 2) * 0.35,
    gain: melodyGain * (noteIndex === 0 ? 1 : 0.88),
    pan: clampPan((noteIndex % 2 === 0 ? -1 : 1) * (0.18 + (safeIndex % 2) * 0.06)),
    timbre: "cell-bell" as const,
  }));

  const rootDegree = motif[0] % 3;
  const membrane: CellularMusicNote = {
    frequency: scaleFrequency(rootDegree) / 2,
    offsetSeconds: 0,
    durationSeconds: scene === "menu" ? 7.8 : 6.4,
    gain: scene === "menu" ? 0.085 : 0.075,
    pan: 0,
    timbre: "membrane",
  };

  return {
    intervalMs: scene === "menu" ? 11_200 : 8_200,
    notes: [membrane, ...melody],
  };
}

function scaleFrequency(scaleDegree: number): number {
  const safeDegree = Math.max(0, Math.floor(scaleDegree));
  const semitones = D_MINOR_PENTATONIC_SEMITONES[
    safeDegree % D_MINOR_PENTATONIC_SEMITONES.length
  ];
  const octave = Math.floor(safeDegree / D_MINOR_PENTATONIC_SEMITONES.length);

  return D3_FREQUENCY * 2 ** ((semitones + octave * 12) / 12);
}

function clampPan(value: number): number {
  return Math.max(-0.4, Math.min(0.4, value));
}
