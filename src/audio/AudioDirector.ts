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
import {
  createCellularMusicPhrase,
  type CellularMusicNote,
} from "./proceduralMusic";

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
  pitchSteps?: number;
  crushSteps?: number;
  crackle?: number;
  harmonicRatio?: number;
}>;

const MAX_TRANSIENT_VOICES = 16;

const GAME_RECIPES: Record<GameAudioEventName, SoundRecipe> = {
  selection: { frequency: 420, endFrequency: 680, duration: 0.055, gain: 0.14, wave: "square", noise: 0.08, pitchSteps: 3, crushSteps: 16, crackle: 0.5 },
  focus: { frequency: 510, endFrequency: 820, duration: 0.085, gain: 0.15, wave: "triangle", noise: 0.07, pitchSteps: 4, crushSteps: 20, crackle: 0.4, harmonicRatio: 2 },
  move: { frequency: 230, endFrequency: 135, duration: 0.075, gain: 0.17, wave: "square", noise: 0.13, pitchSteps: 3, crushSteps: 14, crackle: 0.65 },
  engage: { frequency: 150, endFrequency: 72, duration: 0.11, gain: 0.21, wave: "sawtooth", noise: 0.22, filter: 1450, pitchSteps: 4, crushSteps: 12, crackle: 0.8 },
  special: { frequency: 280, endFrequency: 620, duration: 0.2, gain: 0.23, wave: "square", noise: 0.12, pitchSteps: 6, crushSteps: 18, crackle: 0.45, harmonicRatio: 1.5 },
  arrival: { frequency: 170, endFrequency: 390, duration: 0.2, gain: 0.2, wave: "triangle", noise: 0.18, pitchSteps: 5, crushSteps: 18, crackle: 0.55 },
  combat: { frequency: 118, endFrequency: 54, duration: 0.065, gain: 0.17, wave: "square", noise: 0.42, filter: 1750, pitchSteps: 3, crushSteps: 9, crackle: 1 },
  antibody: { frequency: 860, endFrequency: 430, duration: 0.075, gain: 0.13, wave: "square", noise: 0.12, filter: 4200, pitchSteps: 5, crushSteps: 18, crackle: 0.65 },
  phagocytosis: { frequency: 142, endFrequency: 52, duration: 0.27, gain: 0.23, wave: "sawtooth", noise: 0.34, filter: 1050, pitchSteps: 7, crushSteps: 12, crackle: 0.7, harmonicRatio: 0.5 },
  net: { frequency: 260, endFrequency: 68, duration: 0.32, gain: 0.24, wave: "square", noise: 0.48, filter: 2400, pitchSteps: 8, crushSteps: 10, crackle: 1 },
  nk: { frequency: 132, endFrequency: 58, duration: 0.12, gain: 0.22, wave: "square", noise: 0.28, filter: 1200, pitchSteps: 4, crushSteps: 9, crackle: 0.9, harmonicRatio: 2 },
  cytotoxicT: { frequency: 460, endFrequency: 130, duration: 0.1, gain: 0.2, wave: "square", noise: 0.18, filter: 2800, pitchSteps: 5, crushSteps: 12, crackle: 0.75 },
  infection: { frequency: 92, endFrequency: 43, duration: 0.31, gain: 0.22, wave: "sawtooth", noise: 0.24, filter: 720, pitchSteps: 6, crushSteps: 11, crackle: 0.5, harmonicRatio: 0.5 },
  clearance: { frequency: 330, endFrequency: 740, duration: 0.13, gain: 0.17, wave: "square", noise: 0.1, pitchSteps: 5, crushSteps: 16, crackle: 0.45 },
  dendritic: { frequency: 470, endFrequency: 760, duration: 0.1, gain: 0.15, wave: "triangle", noise: 0.09, pitchSteps: 4, crushSteps: 18, crackle: 0.4 },
  lymph: { frequency: 310, endFrequency: 880, duration: 0.24, gain: 0.21, wave: "square", noise: 0.12, pitchSteps: 7, crushSteps: 20, crackle: 0.4, harmonicRatio: 1.5 },
  biofilm: { frequency: 72, endFrequency: 38, duration: 0.46, gain: 0.22, wave: "sawtooth", noise: 0.34, filter: 620, pitchSteps: 8, crushSteps: 10, crackle: 0.55, harmonicRatio: 0.5 },
  wave: { frequency: 170, endFrequency: 360, duration: 0.34, gain: 0.23, wave: "square", noise: 0.14, pitchSteps: 7, crushSteps: 16, crackle: 0.45 },
  victory: { frequency: 330, endFrequency: 790, duration: 0.54, gain: 0.25, wave: "triangle", noise: 0.08, pitchSteps: 9, crushSteps: 22, crackle: 0.3, harmonicRatio: 1.5 },
  defeat: { frequency: 146, endFrequency: 39, duration: 0.58, gain: 0.24, wave: "sawtooth", noise: 0.18, filter: 960, pitchSteps: 9, crushSteps: 12, crackle: 0.45, harmonicRatio: 0.5 },
  restart: { frequency: 270, endFrequency: 105, duration: 0.14, gain: 0.19, wave: "square", noise: 0.14, pitchSteps: 4, crushSteps: 14, crackle: 0.55 },
};

const UI_RECIPES: Record<UiAudioEvent, SoundRecipe> = {
  hover: { frequency: 760, endFrequency: 620, duration: 0.025, gain: 0.05, wave: "square", pitchSteps: 2, crushSteps: 12 },
  confirm: { frequency: 440, endFrequency: 820, duration: 0.06, gain: 0.11, wave: "square", noise: 0.05, pitchSteps: 3, crushSteps: 16, crackle: 0.35 },
  back: { frequency: 420, endFrequency: 190, duration: 0.07, gain: 0.1, wave: "square", noise: 0.05, pitchSteps: 3, crushSteps: 14, crackle: 0.35 },
  invalid: { frequency: 180, endFrequency: 92, duration: 0.11, gain: 0.13, wave: "sawtooth", noise: 0.09, pitchSteps: 4, crushSteps: 10, crackle: 0.45 },
  pause: { frequency: 320, endFrequency: 145, duration: 0.1, gain: 0.13, wave: "square", pitchSteps: 3, crushSteps: 14 },
  resume: { frequency: 190, endFrequency: 460, duration: 0.1, gain: 0.13, wave: "square", pitchSteps: 4, crushSteps: 14 },
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
  private musicPhraseIndex = 0;
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
    const crusher = context.createWaveShaper();
    const oscillator = context.createOscillator();
    const randomVariation = 0.99 + Math.random() * 0.02;
    const duration = recipe.duration;
    const attack = Math.min(0.004, duration * 0.12);

    filter.type = "lowpass";
    filter.frequency.value = recipe.filter ?? 3200;
    filter.Q.value = 2.4;
    crusher.curve = createQuantizedWaveCurve(recipe.crushSteps ?? 24);
    crusher.oversample = "none";
    panner.pan.value = pan;
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, recipe.gain * randomVariation),
      now + attack,
    );
    output.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.type = recipe.wave ?? "square";
    scheduleSteppedFrequency(
      oscillator.frequency,
      recipe.frequency * randomVariation,
      (recipe.endFrequency ?? recipe.frequency) * randomVariation,
      now,
      duration,
      recipe.pitchSteps ?? 4,
    );
    oscillator.connect(crusher);
    crusher.connect(filter);
    filter.connect(output);
    output.connect(panner);
    panner.connect(destination);

    const sources: AudioScheduledSourceNode[] = [oscillator];
    const disconnectables: AudioNode[] = [output, panner, filter, crusher, oscillator];

    if (recipe.harmonicRatio) {
      const harmonic = context.createOscillator();
      const harmonicGain = context.createGain();
      harmonic.type = recipe.wave === "sawtooth" ? "square" : "triangle";
      harmonicGain.gain.value = 0.24;
      scheduleSteppedFrequency(
        harmonic.frequency,
        recipe.frequency * recipe.harmonicRatio * randomVariation,
        (recipe.endFrequency ?? recipe.frequency) *
          recipe.harmonicRatio *
          randomVariation,
        now,
        duration,
        recipe.pitchSteps ?? 4,
      );
      harmonic.connect(harmonicGain);
      harmonicGain.connect(crusher);
      sources.push(harmonic);
      disconnectables.push(harmonic, harmonicGain);
    }

    if (recipe.noise && this.noiseBuffer) {
      const noise = context.createBufferSource();
      const bodyNoiseGain = context.createGain();
      const crackleFilter = context.createBiquadFilter();
      const crackleGain = context.createGain();
      noise.buffer = this.noiseBuffer;
      bodyNoiseGain.gain.value = recipe.noise * 0.18;
      crackleFilter.type = "highpass";
      crackleFilter.frequency.value = Math.min(
        5200,
        Math.max(950, (recipe.filter ?? 2600) * 0.72),
      );
      crackleFilter.Q.value = 1.6;
      scheduleCrackleEnvelope(
        crackleGain.gain,
        now,
        duration,
        recipe.noise,
        recipe.crackle ?? 0.35,
      );
      noise.connect(bodyNoiseGain);
      bodyNoiseGain.connect(filter);
      noise.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(output);
      sources.push(noise);
      disconnectables.push(noise, bodyNoiseGain, crackleFilter, crackleGain);
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
      for (const node of disconnectables) {
        node.disconnect();
      }
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
      this.startMusicBed(this.scene === "menu" ? 73.42 : 65.41),
    );

    const musicScene = this.scene === "menu" ? "menu" : "game";
    const phrase = createCellularMusicPhrase(musicScene, this.musicPhraseIndex);
    if (this.scene !== "paused" && this.scene !== "result") {
      this.playCellularPhrase();
    }
    this.musicTimer = window.setInterval(() => {
      if (this.scene === "paused" || this.scene === "result") return;
      this.playCellularPhrase();
    }, phrase.intervalMs);
    this.applySettings();
  }

  private startDrone(frequency: number, group: AudioGroup, gainValue: number): () => void {
    const context = this.context;
    const destination = this.groupGains[group];
    if (!context || !destination) return () => undefined;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const crusher = context.createWaveShaper();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    const now = context.currentTime;

    oscillator.type = group === "ambience" ? "triangle" : "square";
    oscillator.frequency.value = frequency;
    filter.type = "lowpass";
    filter.frequency.value = group === "ambience" ? 420 : 560;
    filter.Q.value = 1.8;
    crusher.curve = createQuantizedWaveCurve(group === "ambience" ? 32 : 24);
    crusher.oversample = "none";
    gain.gain.value = gainValue;
    lfo.frequency.value = 0.11;
    lfoGain.gain.value = gainValue * 0.28;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    oscillator.connect(crusher);
    crusher.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    oscillator.start(now);
    lfo.start(now);

    return () => {
      try { oscillator.stop(); } catch { /* already stopped */ }
      try { lfo.stop(); } catch { /* already stopped */ }
      oscillator.disconnect();
      crusher.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  private startMusicBed(frequency: number): () => void {
    const context = this.context;
    const destination = this.groupGains.music;
    if (!context || !destination) return () => undefined;

    const oscillator = context.createOscillator();
    const harmonic = context.createOscillator();
    const harmonicGain = context.createGain();
    const output = context.createGain();
    const filter = context.createBiquadFilter();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    harmonic.type = "square";
    harmonic.frequency.value = frequency * 2;
    harmonicGain.gain.value = 0.06;
    filter.type = "lowpass";
    filter.frequency.value = 520;
    filter.Q.value = 1.2;
    output.gain.value = this.scene === "menu" ? 0.052 : 0.044;
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 4.5;

    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.detune);
    oscillator.connect(filter);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(filter);
    filter.connect(output);
    output.connect(destination);
    oscillator.start(now);
    harmonic.start(now);
    lfo.start(now);

    return () => {
      try { oscillator.stop(); } catch { /* already stopped */ }
      try { harmonic.stop(); } catch { /* already stopped */ }
      try { lfo.stop(); } catch { /* already stopped */ }
      oscillator.disconnect();
      harmonic.disconnect();
      harmonicGain.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
      filter.disconnect();
      output.disconnect();
    };
  }

  private playCellularPhrase(): void {
    const scene = this.scene === "menu" ? "menu" : "game";
    const phrase = createCellularMusicPhrase(scene, this.musicPhraseIndex);
    this.musicPhraseIndex += 1;

    for (const note of phrase.notes) {
      this.scheduleMusicNote(note);
    }
  }

  private scheduleMusicNote(note: CellularMusicNote): void {
    const context = this.context;
    const destination = this.groupGains.music;
    if (!context || !destination || context.state !== "running") return;

    const startTime = context.currentTime + note.offsetSeconds;
    const endTime = startTime + note.durationSeconds;
    const oscillator = context.createOscillator();
    const harmonic = context.createOscillator();
    const harmonicGain = context.createGain();
    const output = context.createGain();
    const filter = context.createBiquadFilter();
    const crusher = context.createWaveShaper();
    const panner = context.createStereoPanner();
    const delay = context.createDelay(1.5);
    const delayGain = context.createGain();
    const feedback = context.createGain();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();

    oscillator.type = note.timbre === "cell-bell" ? "triangle" : "sine";
    oscillator.frequency.value = note.frequency;
    harmonic.type = "square";
    harmonic.frequency.value = note.frequency * (note.timbre === "cell-bell" ? 2 : 1.5);
    harmonicGain.gain.value = note.timbre === "cell-bell" ? 0.09 : 0.035;
    crusher.curve = createQuantizedWaveCurve(note.timbre === "cell-bell" ? 42 : 64);
    crusher.oversample = "none";
    filter.type = "lowpass";
    filter.frequency.value = note.timbre === "cell-bell" ? 2700 : 760;
    filter.Q.value = note.timbre === "cell-bell" ? 1.4 : 0.8;
    panner.pan.value = note.pan;
    delay.delayTime.value = note.timbre === "cell-bell" ? 0.31 : 0.43;
    delayGain.gain.value = note.timbre === "cell-bell" ? 0.32 : 0.18;
    feedback.gain.value = 0.16;
    lfo.frequency.value = note.timbre === "cell-bell" ? 0.17 : 0.09;
    lfoGain.gain.value = note.timbre === "cell-bell" ? 3.2 : 5.5;

    output.gain.setValueAtTime(0.0001, startTime);
    output.gain.exponentialRampToValueAtTime(note.gain, startTime + 0.045);
    output.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, note.gain * 0.38),
      startTime + Math.min(0.7, note.durationSeconds * 0.3),
    );
    output.gain.exponentialRampToValueAtTime(0.0001, endTime);

    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.detune);
    oscillator.connect(crusher);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(crusher);
    crusher.connect(filter);
    filter.connect(output);
    output.connect(panner);
    panner.connect(destination);
    panner.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(destination);
    delay.connect(feedback);
    feedback.connect(delay);

    const sources: AudioScheduledSourceNode[] = [oscillator, harmonic, lfo];
    const nodes: AudioNode[] = [
      oscillator,
      harmonic,
      harmonicGain,
      output,
      filter,
      crusher,
      panner,
      delay,
      delayGain,
      feedback,
      lfo,
      lfoGain,
    ];
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      for (const source of sources) {
        try { source.stop(); } catch { /* already stopped */ }
      }
      this.pulseStops.delete(stop);
    };

    this.pulseStops.add(stop);
    oscillator.addEventListener("ended", () => {
      this.pulseStops.delete(stop);
      for (const node of nodes) node.disconnect();
    }, { once: true });

    for (const source of sources) {
      source.start(startTime);
      source.stop(endTime + 0.75);
    }
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

function createQuantizedWaveCurve(stepCount: number): Float32Array<ArrayBuffer> {
  const sampleCount = 1024;
  const safeStepCount = Math.max(4, Math.round(stepCount));
  const curve = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const normalized = (index / (sampleCount - 1)) * 2 - 1;
    curve[index] = Math.round(normalized * safeStepCount) / safeStepCount;
  }

  return curve;
}

function scheduleSteppedFrequency(
  parameter: AudioParam,
  startFrequency: number,
  endFrequency: number,
  startTime: number,
  duration: number,
  stepCount: number,
): void {
  const safeStepCount = Math.max(2, Math.round(stepCount));

  for (let index = 0; index < safeStepCount; index += 1) {
    const progress = index / (safeStepCount - 1);
    const frequency = startFrequency + (endFrequency - startFrequency) * progress;
    parameter.setValueAtTime(
      Math.max(20, frequency),
      startTime + (duration * index) / safeStepCount,
    );
  }
}

function scheduleCrackleEnvelope(
  parameter: AudioParam,
  startTime: number,
  duration: number,
  amount: number,
  density: number,
): void {
  const burstCount = Math.max(1, Math.round(2 + duration * 18 * density));
  parameter.setValueAtTime(0.0001, startTime);

  for (let index = 0; index < burstCount; index += 1) {
    const burstTime = startTime + duration * ((index + 0.35) / (burstCount + 0.4));
    const burstEnd = Math.min(startTime + duration, burstTime + 0.006);
    parameter.setValueAtTime(0.0001, burstTime);
    parameter.linearRampToValueAtTime(
      Math.max(0.0002, amount * (0.72 + (index % 3) * 0.12)),
      Math.min(burstEnd, burstTime + 0.0012),
    );
    parameter.exponentialRampToValueAtTime(0.0001, burstEnd);
  }
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
