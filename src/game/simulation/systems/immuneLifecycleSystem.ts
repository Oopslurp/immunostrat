import { balanceValues } from "../../data/balance";
import type { GameState } from "../core/GameState";
import { isImmuneUnit, isNeutrophil } from "../entities";

export function applyImmuneLifecycleSystem(
  state: GameState,
  deltaMs: number,
): void {
  const seconds = deltaMs / 1000;

  for (const [id, entity] of Object.entries(state.entities)) {
    if (!isImmuneUnit(entity)) {
      continue;
    }

    if (isNeutrophil(entity)) {
      entity.lifeRemainingMs = Math.max(
        0,
        (entity.lifeRemainingMs ?? balanceValues.neutrophilLifetimeMs) - deltaMs,
      );
      entity.health = Math.max(
        0,
        entity.health - balanceValues.combat.neutrophilSelfDamagePerSecond * seconds,
      );
    }

    if (entity.health <= 0 || (entity.lifeRemainingMs ?? 1) <= 0) {
      delete state.entities[id];
    }
  }
}
