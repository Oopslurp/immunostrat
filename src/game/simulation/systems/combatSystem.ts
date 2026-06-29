import { balanceValues } from "../../data/balance";
import { distanceSquared } from "../../types/shared";
import type { GameState } from "../core/GameState";
import {
  isBacterium,
  isMacrophage,
  type BacteriumEntity,
  type MacrophageEntity,
} from "../entities";

export function applyCombatSystem(state: GameState, deltaMs: number): void {
  const bacteria = Object.values(state.entities).filter(isBacterium);

  for (const entity of Object.values(state.entities)) {
    if (!isMacrophage(entity)) {
      continue;
    }

    entity.attackCooldownRemainingMs = Math.max(
      0,
      entity.attackCooldownRemainingMs - deltaMs,
    );

    if (entity.attackCooldownRemainingMs > 0) {
      continue;
    }

    const target = findNearestBacteriumInRange(entity, bacteria);

    if (!target) {
      continue;
    }

    target.health -= entity.attackDamage;
    entity.attackCooldownRemainingMs = entity.attackCooldownMs;
    state.effects.push({
      id: `effect-${state.nextEffectNumber}`,
      kind: "attack",
      position: { ...target.position },
      radius: target.radius + balanceValues.attackEffectRadiusBonus,
      ttlMs: balanceValues.attackEffectTtlMs,
    });
    state.nextEffectNumber += 1;
  }

  removeDeadBacteria(state);
}

function findNearestBacteriumInRange(
  macrophage: MacrophageEntity,
  bacteria: BacteriumEntity[],
): BacteriumEntity | null {
  let nearest: BacteriumEntity | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const maxDistanceSquared = macrophage.attackRange * macrophage.attackRange;

  for (const bacterium of bacteria) {
    const currentDistance = distanceSquared(macrophage.position, bacterium.position);

    if (currentDistance <= maxDistanceSquared && currentDistance < nearestDistance) {
      nearest = bacterium;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}

function removeDeadBacteria(state: GameState): void {
  for (const [id, entity] of Object.entries(state.entities)) {
    if (isBacterium(entity) && entity.health <= 0) {
      delete state.entities[id];
    }
  }
}
