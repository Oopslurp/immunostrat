import type { EntityVisualState } from "../assets/entitySpriteManifest";

export type DendriticVisualState =
  | "idle"
  | "move"
  | "collect"
  | "carry"
  | "moveCarry1"
  | "moveCarry2"
  | "moveCarry3"
  | "signal"
  | "hurt"
  | "death";

export type DendriticVisualSelection = Readonly<{
  dead: boolean;
  hurt: boolean;
  collected: boolean;
  signalled: boolean;
  moving: boolean;
  carriedDebrisCount: number;
}>;

export function didDendriticCollect(
  previousCount: number,
  currentCount: number,
): boolean {
  return currentCount > previousCount;
}

export function didDendriticSignal(
  previousCount: number,
  currentCount: number,
  transitPhase: "following" | "away" | undefined,
): boolean {
  return previousCount > 0 && currentCount === 0 && transitPhase === "away";
}

export function selectDendriticVisualState(
  selection: DendriticVisualSelection,
): DendriticVisualState {
  if (selection.dead) return "death";
  if (selection.signalled) return "signal";
  if (selection.hurt) return "hurt";
  if (selection.collected) return "collect";

  if (selection.carriedDebrisCount > 0) {
    if (!selection.moving) return "carry";
    if (selection.carriedDebrisCount === 1) return "moveCarry1";
    if (selection.carriedDebrisCount === 2) return "moveCarry2";
    return "moveCarry3";
  }

  return selection.moving ? "move" : "idle";
}

export function isOneShotDendriticState(
  state: DendriticVisualState,
): boolean {
  return (
    state === "collect" ||
    state === "signal" ||
    state === "hurt" ||
    state === "death"
  );
}

export function isLoopingDendriticState(
  state: DendriticVisualState,
): boolean {
  return !isOneShotDendriticState(state);
}

export function canInterruptDendriticState(
  current: DendriticVisualState,
  requested: DendriticVisualState,
): boolean {
  const priority: Record<DendriticVisualState, number> = {
    idle: 0,
    move: 1,
    carry: 1,
    moveCarry1: 1,
    moveCarry2: 1,
    moveCarry3: 1,
    collect: 2,
    hurt: 3,
    signal: 4,
    death: 5,
  };

  return priority[requested] > priority[current];
}

export function toDendriticEntityVisualState(
  state: DendriticVisualState,
): EntityVisualState {
  return state === "death" ? "dead" : state;
}
