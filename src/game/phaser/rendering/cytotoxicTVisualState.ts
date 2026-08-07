import type { CombatEffect } from "../../simulation/core/GameState";
import type { EntityVisualState } from "../assets/entitySpriteManifest";

export type CytotoxicTVisualState =
  | "idle"
  | "move"
  | "cytotoxicStrike"
  | "hurt"
  | "death";

export function didCytotoxicTAttackTrigger(
  previousCooldownMs: number,
  currentCooldownMs: number,
): boolean {
  return currentCooldownMs > previousCooldownMs + 0.01;
}

export function didCytotoxicTStrikeEffect(
  effects: readonly CombatEffect[],
  entityId: string,
): boolean {
  return effects.some(
    (effect) =>
      effect.sourceEntityId === entityId &&
      (effect.kind === "attack" || effect.kind === "cytotoxic"),
  );
}

export function selectCytotoxicTVisualState(input: Readonly<{
  dead: boolean;
  hurt: boolean;
  attacking: boolean;
  moving: boolean;
}>): CytotoxicTVisualState {
  if (input.dead) return "death";
  if (input.hurt) return "hurt";
  if (input.attacking) return "cytotoxicStrike";
  return input.moving ? "move" : "idle";
}

export function canInterruptCytotoxicTState(
  current: CytotoxicTVisualState,
  requested: CytotoxicTVisualState,
): boolean {
  const priority: Record<CytotoxicTVisualState, number> = {
    idle: 0,
    move: 1,
    cytotoxicStrike: 2,
    hurt: 3,
    death: 4,
  };
  return priority[requested] > priority[current];
}

export function isOneShotCytotoxicTState(
  state: CytotoxicTVisualState,
): boolean {
  return state === "cytotoxicStrike" || state === "hurt" || state === "death";
}

export function isLoopingCytotoxicTState(
  state: CytotoxicTVisualState,
): boolean {
  return state === "idle" || state === "move";
}

export function nextCytotoxicTStateAfterComplete(
  state: CytotoxicTVisualState,
  moving: boolean,
): CytotoxicTVisualState {
  if (state === "death") return "death";
  return moving ? "move" : "idle";
}

export function toCytotoxicTEntityVisualState(
  state: CytotoxicTVisualState,
): EntityVisualState {
  if (state === "cytotoxicStrike") return "special";
  return state === "death" ? "dead" : state;
}
