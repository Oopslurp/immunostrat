import {
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  saveAudioSettings,
  type AudioSettings,
  type AudioVolumeKey,
} from "./audioSettings";
import type {
  AudioPriority,
  GameAudioEvent,
  GameAudioEventName,
  UiAudioEvent,
} from "./audioEvents";

type AudioScene = "menu" | "game" | "paused" | "result";
type AudioGroup = "music" | "ambience" | "sfx" | "ui";

type Voice = {
  priority: AudioPriority;
  stop: () => void;
};

type SoundRecipe = Readonly<{
  frequency: number;
  endFrequency?: number;
  duration: number;
  gain: number;
  wave?: OscillatorType;
  noise?: number;
  filter?: number;
}>;

const MAX_TRANSIENT_VOICES = 16;

const GAME_RECIPES: Record<GameAudioEventName, SoundRecipe> = {
  selection: { frequency: 320, endFrequency: 430, duration: 0.08, gain: 0.11 },
  focus: { frequency: 460, endFrequency: 610, duration: 0.12, gain: 0.13 },
  move: { frequency: 170, endFrequency: 250, duration: 0.11, gain: 0.15, noise: 0.1 },
  engage: { frequency: 115, endFrequency: 82, duration: 0.15, gain: 0.18, noise: 0.18 },
  special: { frequency: 260, endFrequency: 520, duration: 0.24, gain: 0.2, wave: "triangle" },
  arrival: { frequency: 145, endFrequency: 330, duration: 0.28, gain: 0.17, noise: 0.12 },
  combat: { frequency: 92, endFrequency: 62, duration: 0.09, gain: 0.12, noise: 0.3, filter: 1150 },
  antibody: { frequency: 690, endFrequency: 470, duration: 0.11, gain: 0.1, wave: "sine" },
  phagocytosis: { frequency: 124, endFrequency: 68, duration: 0.34, gain: 0.19, noise: 0.22, filter: 760 },
  net: { frequency: 210, endFrequency: 82, duration: 0.42, gain: 0.21, noise: 0.36, filter: 1700 },
  nk: { frequency: 105, endFrequency: 72, duration: 0.16, gain: 0.18, wave: "square", filter: 800 },
  cytotoxicT: { frequency: 380, endFrequency: 155, duration: 0.14, gain: 0.16, wave: "triangle" },
  infection: { frequency: 78, endFrequency: 54, duration: 0.4, gain: 0.19, noise: 0.12, filter: 520 },
  clearance: { frequency: 260, endFrequency: 580, duration: 0.18, gain: 0.14, wave: "sine" },
  dendritic: { frequency: 420, endFrequency: 650, duration: 0.14, gain: 0.12 },
  lymph: { frequency: 290, endFrequency: 760, duration: 0.32, gain: 0.18, wave: "sine" },
  biofilm: { frequency: 64, endFrequency: 48, duration: 0.58, gain: 0.18, noise: 0.2, filter: 430 },
  wave: { frequency: 155, endFrequency: 310, duration: 0.46, gain: 0.2, wave: "triangle" },
  victory: { frequency: 330, endFrequency: 660, duration: 0.72, gain: 0.23, wave: "sine" },
  defeat: { frequency: 130, endFrequency: 48, duration: 0.78, gain: 0.22, wave: "triangle", noise: 0.08 },
  restart: { frequency: 230, endFrequency: 120, duration: 0.2, gain: 0.16, noise: 0.08 },
};

const UI_RECIPES: Record<UiAudioEvent, SoundRecipe> = {
  hover: { frequency: 520, endFrequency: 560, duration: 0.045, gain: 0.045 },
  confirm: { frequency: 380, endFrequency: 610, duration: 0.09, gain: 0.09 },
  back: { frequency: 360, endFrequency: 210, duration: 0.11, gain: 0.085 },
  invalid: { frequency: 145, endFrequency: 118, duration: 0.16, gain: 0.1, wave: "triangle" },
  pause: { frequency: 280, endFrequency: 170, duration: 0.16, gain: 0.1 },
  resume: { frequency: 210, endFrequency: 390, duration: 0.16, gain: 0.1 },
};

export class AudioDirector {
  private settings: AudioSettings = loadAudioSettings();
  private readonly listeners = new Set<() => void>();
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private groupGains: Partial<Record<AudioGroup, GainNode>> = {};
  private noiseBuffer: AudioBuffer | null = null;
  private readonly voices = new Set<Voice>();
  private loopStops: Array<() => void> = [];
  private readonly pulseStops = new Set<() => void>();
  private musicTimer: number | null = null;
  private scene: AudioScene = "menu";
  private unlocked = false;
  private hidden = false;
  private lastPlayedAt = new Map<string, number>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };

  getSettings = (): AudioSettings => this.settings;

  async unlock(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    if (!this.context) {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextConstructor) {
        return;
      }

      this.context = new AudioContextConstructor();
      this.setupGraph(this.context);
    }

    try {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      this.unlocked = true;
      this.applySettings();
      this.ensureLoops();
    } catch {
      // A later user gesture will retry the browser unlock safely.
    }
  }

  setVolume(key: AudioVolumeKey, value: number): void {
    this.updateSettings({ [key]: Math.min(1, Math.max(0, value)) });
  }

  setMuted(muted: boolean): void {
    this.updateSettings({ muted });
  }

  resetSettings(): void {
    this.settings = DEFAULT_AUDIO_SETTINGS;
    saveAudioSettings(this.settings);
    this.applySettings();
    this.emitSettings();
  }

  setScene(scene: AudioScene): void {
    if (scene === this.scene) {
      return;
    }

    this.scene = scene;
    this.stopLoops();
    this.ensureLoops();
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;

    if (!this.context || !this.unlocked) {
      return;
    }

    if (hidden) {
      this.stopLoops();
      this.stopTransientVoices();
      void this.context.suspend().catch(() => undefined);
      return;
    }

    void this.context
      .resume()
      .then(() => this.ensureLoops())
      .catch(() => undefined);
  }

  playUi(event: UiAudioEvent): void {
    const cooldown = event === "hover" ? 110 : 45;
    const priority: AudioPriority = event === "hover" ? 3 : 2;

    this.playRecipe(`ui.${event}`, UI_RECIPES[event], "ui", priority, cooldown);
  }

  playGame(event: GameAudioEvent): void {
    const pan =
      typeof event.x === "number" && event.worldWidth
        ? Math.min(0.55, Math.max(-0.55, (event.x / event.worldWidth) * 1.1 - 0.55))
        : 0;
    const cooldown = getGameCooldown(event.name);

    this.playRecipe(
      `game.${event.name}`,
      event.offscreen
        ? {
            ...GAME_RECIPES[event.name],
            gain: GAME_RECIPES[event.name].gain * 0.38,
          }
        : GAME_RECIPES[event.name],
      "sfx",
      event.priority,
      cooldown,
      pan,
    );
  }

  stopTransientVoices(): void {
    for (const voice of Array.from(this.voices)) {
      voice.stop();
    }
    this.voices.clear();
  }

  resetSession(): void {
    this.stopTransientVoices();
    for (const key of Array.from(this.lastPlayedAt.keys())) {
      if (key.startsWith("game.")) this.lastPlayedAt.delete(key);
    }
  }

  dispose(): void {
    this.stopLoops();
    this.stopTransientVoices();
    this.listeners.clear();
    this.lastPlayedAt.clear();
    if (this.context) {
      void this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.masterGain = null;
    this.groupGains = {};
    this.noiseBuffer = null;
    this.unlocked = false;
  }

  private updateSettings(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch, version: 1 };
    saveAudioSettings(this.settings);
    this.applySettings();
    this.emitSettings();
  }

  private emitSettings(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setupGraph(context: AudioContext): void {
    this.masterGain = context.createGain();
    this.masterGain.connect(context.destination);

    for (const group of ["music", "ambience", "sfx", "ui"] as const) {
      const gain = context.createGain();
      gain.connect(this.masterGain);
      this.groupGains[group] = gain;
    }

    this.noiseBuffer = createNoiseBuffer(context);
  }

  private applySettings(): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(
      this.settings.muted ? 0 : this.settings.master,
      now,
      0.025,
    );
    this.groupGains.music?.gain.setTargetAtTime(
      this.settings.music * (this.scene === "paused" ? 0.55 : 1),
      now,
      0.05,
    );
    this.groupGains.ambience?.gain.setTargetAtTime(
      this.settings.ambience * (this.scene === "paused" ? 0.42 : 1),
      now,
      0.05,
    );
    this.groupGains.sfx?.gain.setTargetAtTime(
      this.scene === "paused" ? 0 : this.settings.sfx,
      now,
      0.025,
    );
    this.groupGains.ui?.gain.setTargetAtTime(this.settings.ui, now, 0.025);
  }

  private playRecipe(
    key: string,
    recipe: SoundRecipe,
    group: AudioGroup,
    priority: AudioPriority,
    cooldownMs: number,
    pan = 0,
  ): void {
    const context = this.context;
    const destination = this.groupGains[group];

    if (
      !context ||
      !destination ||
      !this.unlocked ||
      this.hidden ||
      context.state !== "running" ||
      (group === "sfx" && this.scene === "paused")
    ) {
      return;
    }

    const nowMs = performance.now();
    const previous = this.lastPlayedAt.get(key) ?? -Infinity;
    if (nowMs - previous < cooldownMs || !this.reserveVoice(priority)) {
      return;
    }
    this.lastPlayedAt.set(key, nowMs);

    const now = context.currentTime;
    const output = context.createGain();
    const panner = context.createStereoPanner();
    const filter = context.createBiquadFilter();
    const oscillator = context.createOscillator();
    const randomVariation = 0.985 + Math.random() * 0.03;
    const duration = recipe.duration;
    const attack = Math.min(0.025, duration * 0.2);

    filter.type = "lowpass";
    filter.frequency.value = recipe.filter ?? 2600;
    panner.pan.value = pan;
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, recipe.gain * randomVariation),
      now + attack,
    );
    output.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.type = recipe.wave ?? "sine";
    oscillator.frequency.setValueAtTime(recipe.frequency * randomVariation, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, (recipe.endFrequency ?? recipe.frequency) * randomVariation),
      now + duration,
    );
    oscillator.connect(filter);
    filter.connect(output);
    output.connect(panner);
    panner.connect(destination);

    const sources: AudioScheduledSourceNode[] = [oscillator];
    if (recipe.noise && this.noiseBuffer) {
      const noise = context.createBufferSource();
      const noiseGain = context.createGain();
      noise.buffer = this.noiseBuffer;
      noiseGain.gain.value = recipe.noise;
      noise.connect(noiseGain);
      noiseGain.connect(filter);
      sources.push(noise);
    }

    let stopped = false;
    const voice: Voice = {
      priority,
      stop: () => {
        if (stopped) return;
        stopped = true;
        for (const source of sources) {
          try {
            source.stop();
          } catch {
            // Already stopped.
          }
        }
        this.voices.delete(voice);
      },
    };

    this.voices.add(voice);
    oscillator.addEventListener("ended", () => {
      this.voices.delete(voice);
      output.disconnect();
      panner.disconnect();
      filter.disconnect();
    }, { once: true });

    for (const source of sources) {
      source.start(now);
      source.stop(now + duration + 0.02);
    }
  }

  private reserveVoice(priority: AudioPriority): boolean {
    if (this.voices.size < MAX_TRANSIENT_VOICES) {
      return true;
    }

    const replaceable = Array.from(this.voices).find(
      (voice) => voice.priority > priority,
    );
    if (!replaceable) {
      return false;
    }
    replaceable.stop();
    return true;
  }

  private ensureLoops(): void {
    if (
      !this.context ||
      !this.unlocked ||
      this.hidden ||
      this.context.state !== "running" ||
      this.loopStops.length
    ) {
      this.applySettings();
      return;
    }

    const ambienceFrequency = this.scene === "menu" ? 52 : 43;
    this.loopStops.push(
      this.startDrone(ambienceFrequency, "ambience", this.scene === "menu" ? 0.05 : 0.065),
    );
    this.loopStops.push(
      this.startDrone(ambienceFrequency * 1.51, "music", this.scene === "menu" ? 0.025 : 0.035),
    );
    this.musicTimer = window.setInterval(() => {
      if (this.scene === "paused" || this.scene === "result") return;
      this.playTonalPulse();
    }, this.scene === "menu" ? 7200 : 5600);
    this.applySettings();
  }

  private startDrone(frequency: number, group: AudioGroup, gainValue: number): () => void {
    const context = this.context;
    const destination = this.groupGains[group];
    if (!context || !destination) return () => undefined;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    filter.type = "lowpass";
    filter.frequency.value = 460;
    gain.gain.value = gainValue;
    lfo.frequency.value = 0.11;
    lfoGain.gain.value = gainValue * 0.28;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    oscillator.start(now);
    lfo.start(now);

    return () => {
      try { oscillator.stop(); } catch { /* already stopped */ }
      try { lfo.stop(); } catch { /* already stopped */ }
      oscillator.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  private playTonalPulse(): void {
    const context = this.context;
    const destination = this.groupGains.music;
    if (!context || !destination) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const frequency = this.scene === "menu" ? 196 : 146.83;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + 1.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    oscillator.connect(gain);
    gain.connect(destination);
    let stopped = false;
    const stopPulse = () => {
      if (stopped) return;
      stopped = true;
      try { oscillator.stop(); } catch { /* already stopped */ }
    };
    this.pulseStops.add(stopPulse);
    oscillator.start(now);
    oscillator.stop(now + 1.85);
    oscillator.addEventListener("ended", () => {
      stopped = true;
      this.pulseStops.delete(stopPulse);
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
  }

  private stopLoops(): void {
    for (const stop of this.loopStops.splice(0)) {
      stop();
    }
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    for (const stopPulse of Array.from(this.pulseStops)) {
      stopPulse();
    }
    this.pulseStops.clear();
  }
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x1155;

  for (let index = 0; index < length; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[index] = ((seed / 0xffffffff) * 2 - 1) * 0.72;
  }
  return buffer;
}

function getGameCooldown(name: GameAudioEventName): number {
  const cooldowns: Partial<Record<GameAudioEventName, number>> = {
    combat: 90,
    antibody: 85,
    net: 190,
    infection: 320,
    biofilm: 900,
    wave: 1800,
    victory: 4000,
    defeat: 4000,
    selection: 80,
  };
  return cooldowns[name] ?? 120;
}

export const audioDirector = new AudioDirector();
