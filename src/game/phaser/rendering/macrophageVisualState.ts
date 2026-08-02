export type MacrophageVisualState =
  | "idle"
  | "move"
  | "attack"
  | "phagocytosis"
  | "hurt"
  | "death";

export type MacrophageVisualSignals = Readonly<{
  dead: boolean;
  hurt: boolean;
  phagocytosing: boolean;
  attacking: boolean;
  moving: boolean;
}>;

const STATE_PRIORITY: Record<MacrophageVisualState, number> = {
  idle: 0,
  move: 1,
  attack: 2,
  hurt: 3,
  phagocytosis: 4,
  death: 5,
};

export function selectMacrophageVisualState(
  signals: MacrophageVisualSignals,
): MacrophageVisualState {
  if (signals.dead) return "death";
  if (signals.phagocytosing) return "phagocytosis";
  if (signals.hurt) return "hurt";
  if (signals.attacking) return "attack";
  if (signals.moving) return "move";
  return "idle";
}

export function isOneShotMacrophageState(
  state: MacrophageVisualState,
): boolean {
  return (
    state === "attack" ||
    state === "phagocytosis" ||
    state === "hurt" ||
    state === "death"
  );
}

export function canInterruptMacrophageState(
  current: MacrophageVisualState,
  next: MacrophageVisualState,
): boolean {
  if (current === "death") return false;
  if (current === "phagocytosis") return next === "death";
  if (!isOneShotMacrophageState(current)) return true;
  return STATE_PRIORITY[next] > STATE_PRIORITY[current];
}

export function stateAfterMacrophageAnimationComplete(
  completed: MacrophageVisualState,
  moving: boolean,
): MacrophageVisualState {
  if (completed === "death") return "death";
  return moving ? "move" : "idle";
}

export function shouldPlayMacrophageAnimation(
  currentAnimationKey: string | null,
  requestedAnimationKey: string,
  isPlaying: boolean,
): boolean {
  return currentAnimationKey !== requestedAnimationKey || !isPlaying;
}

export function didMacrophageAttackTrigger(
  previousCooldownMs: number,
  currentCooldownMs: number,
): boolean {
  return currentCooldownMs > previousCooldownMs + 1;
}

export function resolveStableHorizontalFacing(
  previousFacing: -1 | 1,
  movementDeltaX: number,
  targetDeltaX: number,
  movementThreshold = 0.12,
  targetThreshold = 2,
): -1 | 1 {
  if (Math.abs(movementDeltaX) >= movementThreshold) {
    return movementDeltaX < 0 ? -1 : 1;
  }
  if (Math.abs(targetDeltaX) >= targetThreshold) {
    return targetDeltaX < 0 ? -1 : 1;
  }
  return previousFacing;
}

export function toEntityVisualState(
  state: MacrophageVisualState,
): "idle" | "move" | "attack" | "phagocytosis" | "hurt" | "dead" {
  return state === "death" ? "dead" : state;
}
