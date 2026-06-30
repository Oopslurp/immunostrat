import { balanceValues } from "../../data/balance";
import type { GameState } from "../core/GameState";
import { isNeutrophil } from "../entities";

export function applyImmuneLifecycleSystem(
  state: GameState,
  deltaMs: number,
): void {
  const seconds = deltaMs / 1000;

  for (const [id, entity] of Object.entries(state.entities)) {
    if (!isNeutrophil(entity)) {
      continue;
    }

    entity.lifeRemainingMs = Math.max(
      0,
      (entity.lifeRemainingMs ?? balanceValues.neutrophilLifetimeMs) - deltaMs,
    );
    entity.health = Math.max(
      0,
      entity.health - balanceValues.combat.neutrophilSelfDamagePerSecond * seconds,
    );

    if (entity.lifeRemainingMs <= 0 || entity.health <= 0) {
      delete state.entities[id];
    }
  }
}
