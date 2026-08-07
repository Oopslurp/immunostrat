import type { EntityVisualState } from "../assets/entitySpriteManifest";
import type { CombatEffect } from "../../simulation/core/GameState";

export type NkVisualState =
  | "idle"
  | "move"
  | "detectNormal"
  | "detectAbnormal"
  | "cytotoxicStrike"
  | "hurt"
  | "death";

export function didNkFinisherTrigger(
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
  finishing: boolean;
  detectionOutcome: "normal" | "abnormal" | null;
  moving: boolean;
}>): NkVisualState {
  if (input.dead) return "death";
  if (input.hurt) return "hurt";
  if (input.finishing) return "cytotoxicStrike";
  if (input.detectionOutcome === "abnormal") return "detectAbnormal";
  if (input.detectionOutcome === "normal") return "detectNormal";
  return input.moving ? "move" : "idle";
}

export function canInterruptNkState(
  current: NkVisualState,
  requested: NkVisualState,
): boolean {
  const priority: Record<NkVisualState, number> = {
    idle: 0,
    move: 1,
    detectNormal: 2,
    detectAbnormal: 2,
    cytotoxicStrike: 3,
    hurt: 4,
    death: 5,
  };

  return priority[requested] > priority[current];
}

export function isOneShotNkState(state: NkVisualState): boolean {
  return state === "cytotoxicStrike" || state === "hurt" || state === "death";
}

export function isLoopingNkState(state: NkVisualState): boolean {
  return (
    state === "idle" ||
    state === "move" ||
    state === "detectNormal" ||
    state === "detectAbnormal"
  );
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
