import { balanceValues } from "../../data/balance";
import { distance, distanceSquared } from "../../types/shared";
import type { GameState } from "../core/GameState";
import {
  isBacterium,
  isImmuneUnit,
  isNeutrophil,
  type BacteriumEntity,
  type ImmuneUnitEntity,
} from "../entities";

export function applyCombatSystem(state: GameState, deltaMs: number): void {
  const bacteria = Object.values(state.entities).filter(isBacterium);

  for (const entity of Object.values(state.entities)) {
    if (!isImmuneUnit(entity)) {
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

    const damageMultiplier = getInflammationDamageMultiplier(state, entity);
    target.health -= entity.attackDamage * damageMultiplier;
    entity.attackCooldownRemainingMs = entity.attackCooldownMs;

    state.inflammation.value = Math.min(
      balanceValues.inflammation.maxValue,
      state.inflammation.value +
        balanceValues.inflammation.combatIncrease +
        (isNeutrophil(entity)
          ? balanceValues.inflammation.neutrophilAttackIncrease
          : 0),
    );
    addInflammatoryZone(state, entity, target);
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
  immuneUnit: ImmuneUnitEntity,
  bacteria: BacteriumEntity[],
): BacteriumEntity | null {
  let nearest: BacteriumEntity | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const maxDistanceSquared = immuneUnit.attackRange * immuneUnit.attackRange;

  for (const bacterium of bacteria) {
    const currentDistance = distanceSquared(immuneUnit.position, bacterium.position);

    if (currentDistance <= maxDistanceSquared && currentDistance < nearestDistance) {
      nearest = bacterium;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}

function getInflammationDamageMultiplier(
  state: GameState,
  immuneUnit: ImmuneUnitEntity,
): number {
  const usefulBonus =
    state.inflammation.value >= balanceValues.inflammation.usefulThreshold &&
    state.inflammation.value < balanceValues.inflammation.dangerThreshold
      ? balanceValues.inflammation.usefulCombatBonus
      : 1;
  const zoneBonus = state.inflammatoryZones.some(
    (zone) => distance(zone.position, immuneUnit.position) <= zone.radius,
  )
    ? 1.08
    : 1;

  return usefulBonus * zoneBonus;
}

function addInflammatoryZone(
  state: GameState,
  immuneUnit: ImmuneUnitEntity,
  target: BacteriumEntity,
): void {
  const config = balanceValues.inflammatoryZone;

  state.inflammatoryZones.push({
    id: `zone-${state.nextEffectNumber}`,
    position: { ...target.position },
    radius: config.radius,
    intensity: isNeutrophil(immuneUnit)
      ? config.intensityOnNeutrophilAttack
      : config.intensityOnMacrophageAttack,
    ttlMs: config.ttlMs,
  });
}

function removeDeadBacteria(state: GameState): void {
  for (const [id, entity] of Object.entries(state.entities)) {
    if (isBacterium(entity) && entity.health <= 0) {
      delete state.entities[id];
    }
  }
}
