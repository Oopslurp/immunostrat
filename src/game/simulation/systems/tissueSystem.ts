import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { distance } from "../../types/shared";
import type { GameState } from "../core/GameState";
import { isBacterium } from "../entities";

export function applyTissueSystem(state: GameState, deltaMs: number): void {
  const mission = missionDefinitions[state.missionId];

  for (const entity of Object.values(state.entities)) {
    if (!isBacterium(entity)) {
      continue;
    }

    entity.attackCooldownRemainingMs = Math.max(
      0,
      entity.attackCooldownRemainingMs - deltaMs,
    );

    if (
      distance(entity.position, mission.map.tissueCore) > entity.tissueAttackRange ||
      entity.attackCooldownRemainingMs > 0
    ) {
      continue;
    }

    state.tissue.health = Math.max(0, state.tissue.health - entity.tissueDamage);
    entity.attackCooldownRemainingMs = entity.attackCooldownMs;
    state.effects.push({
      id: `effect-${state.nextEffectNumber}`,
      kind: "tissueDamage",
      position: { ...mission.map.tissueCore },
      radius: balanceValues.tissueDamageEffectRadius,
      ttlMs: balanceValues.tissueDamageEffectTtlMs,
    });
    state.nextEffectNumber += 1;
  }
}
