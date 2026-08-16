export type AudioPriority = 1 | 2 | 3;

export type GameAudioEventName =
  | "selection"
  | "focus"
  | "move"
  | "engage"
  | "special"
  | "arrival"
  | "combat"
  | "antibody"
  | "phagocytosis"
  | "net"
  | "nk"
  | "cytotoxicT"
  | "infection"
  | "clearance"
  | "dendritic"
  | "lymph"
  | "biofilm"
  | "wave"
  | "victory"
  | "defeat"
  | "restart";

export type GameAudioEvent = Readonly<{
  name: GameAudioEventName;
  priority: AudioPriority;
  x?: number;
  y?: number;
  worldWidth?: number;
  offscreen?: boolean;
}>;

export type UiAudioEvent = "hover" | "confirm" | "back" | "invalid" | "pause" | "resume";
