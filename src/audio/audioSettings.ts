export type AudioSettings = Readonly<{
  version: 1;
  muted: boolean;
  master: number;
  music: number;
  ambience: number;
  sfx: number;
  ui: number;
}>;

export type AudioVolumeKey = "master" | "music" | "ambience" | "sfx" | "ui";

export const AUDIO_SETTINGS_KEY = "immunostrat-audio-v1";

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  version: 1,
  muted: false,
  master: 0.72,
  music: 0.32,
  ambience: 0.38,
  sfx: 0.68,
  ui: 0.52,
};

export function normalizeAudioSettings(value: unknown): AudioSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_AUDIO_SETTINGS;
  }

  const candidate = value as Partial<Record<keyof AudioSettings, unknown>>;

  return {
    version: 1,
    muted:
      typeof candidate.muted === "boolean"
        ? candidate.muted
        : DEFAULT_AUDIO_SETTINGS.muted,
    master: normalizeVolume(candidate.master, DEFAULT_AUDIO_SETTINGS.master),
    music: normalizeVolume(candidate.music, DEFAULT_AUDIO_SETTINGS.music),
    ambience: normalizeVolume(
      candidate.ambience,
      DEFAULT_AUDIO_SETTINGS.ambience,
    ),
    sfx: normalizeVolume(candidate.sfx, DEFAULT_AUDIO_SETTINGS.sfx),
    ui: normalizeVolume(candidate.ui, DEFAULT_AUDIO_SETTINGS.ui),
  };
}

export function loadAudioSettings(): AudioSettings {
  if (typeof window === "undefined") {
    return DEFAULT_AUDIO_SETTINGS;
  }

  try {
    const saved = window.localStorage.getItem(AUDIO_SETTINGS_KEY);

    return saved
      ? normalizeAudioSettings(JSON.parse(saved) as unknown)
      : DEFAULT_AUDIO_SETTINGS;
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable in private or hardened browser contexts.
  }
}

function normalizeVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value));
}
