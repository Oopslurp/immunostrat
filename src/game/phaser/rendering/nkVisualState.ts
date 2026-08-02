import type { EntityVisualState } from "../assets/entitySpriteManifest";
import type { CombatEffect } from "../../simulation/core/GameState";

export type NkVisualState =
  | "idle"
  | "move"
  | "attack"
  | "cytotoxicStrike"
  | "hurt"
  | "death";

export function didNkAttackTrigger(
  previousCooldownMs: number,
  currentCooldownMs: number,
): boolean {
  return currentCooldownMs > previousCooldownMs + 0.01;
}

export function didNkCytotoxicStrike(
  effects: readonly CombatEffect[],
  entityId: string,
): boolean {
  return effects.some(
    (effect) =>
      effect.kind === "cytotoxic" && effect.sourceEntityId === entityId,
  );
}

export function selectNkVisualState(input: Readonly<{
  dead: boolean;
  hurt: boolean;
  attacking: boolean;
  cytotoxicStrike: boolean;
  moving: boolean;
}>): NkVisualState {
  if (input.dead) return "death";
  if (input.hurt) return "hurt";
  if (input.attacking && input.cytotoxicStrike) return "cytotoxicStrike";
  if (input.attacking) return "attack";
  return input.moving ? "move" : "idle";
}

export function canInterruptNkState(
  current: NkVisualState,
  requested: NkVisualState,
): boolean {
  const priority: Record<NkVisualState, number> = {
    idle: 0,
    move: 1,
    attack: 2,
    cytotoxicStrike: 3,
    hurt: 4,
    death: 5,
  };

  return priority[requested] > priority[current];
}

export function isOneShotNkState(state: NkVisualState): boolean {
  return (
    state === "attack" ||
    state === "cytotoxicStrike" ||
    state === "hurt" ||
    state === "death"
  );
}

export function isLoopingNkState(state: NkVisualState): boolean {
  return state === "idle" || state === "move";
}

export function nextNkStateAfterComplete(
  state: NkVisualState,
  moving: boolean,
): NkVisualState {
  if (state === "death") return "death";
  return moving ? "move" : "idle";
}

export function toNkEntityVisualState(
  state: NkVisualState,
): EntityVisualState {
  if (state === "cytotoxicStrike") return "special";
  return state === "death" ? "dead" : state;
}
