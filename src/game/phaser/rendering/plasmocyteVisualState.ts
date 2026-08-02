import type { EntityVisualState } from "../assets/entitySpriteManifest";

export type PlasmocyteVisualState =
  | "idle"
  | "move"
  | "produce"
  | "secrete"
  | "hurt"
  | "death";

export function didPlasmocyteAttackTrigger(
  previousCooldownMs: number,
  currentCooldownMs: number,
): boolean {
  return currentCooldownMs > previousCooldownMs + 0.01;
}

export function selectPlasmocyteVisualState(input: Readonly<{
  dead: boolean;
  hurt: boolean;
  attacking: boolean;
  moving: boolean;
}>): PlasmocyteVisualState {
  if (input.dead) return "death";
  if (input.hurt) return "hurt";
  if (input.attacking) return "produce";
  return input.moving ? "move" : "idle";
}

export function canInterruptPlasmocyteState(
  current: PlasmocyteVisualState,
  requested: PlasmocyteVisualState,
): boolean {
  const priority: Record<PlasmocyteVisualState, number> = {
    idle: 0,
    move: 1,
    produce: 2,
    secrete: 2,
    hurt: 3,
    death: 4,
  };

  return priority[requested] > priority[current];
}

export function isOneShotPlasmocyteState(
  state: PlasmocyteVisualState,
): boolean {
  return (
    state === "produce" ||
    state === "secrete" ||
    state === "hurt" ||
    state === "death"
  );
}

export function isLoopingPlasmocyteState(
  state: PlasmocyteVisualState,
): boolean {
  return state === "idle" || state === "move";
}

export function nextPlasmocyteStateAfterComplete(
  state: PlasmocyteVisualState,
  moving: boolean,
): PlasmocyteVisualState {
  if (state === "death") return "death";
  if (state === "produce") return "secrete";
  return moving ? "move" : "idle";
}

export function toPlasmocyteEntityVisualState(
  state: PlasmocyteVisualState,
): EntityVisualState {
  if (state === "produce") return "special";
  if (state === "secrete") return "attack";
  if (state === "death") return "dead";
  return state;
}
