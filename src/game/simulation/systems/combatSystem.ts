import { balanceValues } from "../../data/balance";
import { pathogenDefinitions } from "../../data/pathogens";
import { distance, distanceSquared } from "../../types/shared";
import type { GameState } from "../core/GameState";
import {
  isBacterium,
  isImmuneUnit,
  isMacrophage,
  isNeutrophil,
  isPlasmocyte,
  type BacteriumEntity,
  type ImmuneUnitEntity,
} from "../entities";

export function applyCombatSystem(state: GameState, deltaMs: number): void {
  processPhagocytosis(state, deltaMs);
  const bacteria = Object.values(state.entities).filter(isBacterium);

  for (const entity of Object.values(state.entities)) {
    if (!isImmuneUnit(entity)) {
      continue;
    }

    if (entity.attackDamage <= 0 || entity.attackRange <= 0) {
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

    if (isMacrophage(entity) && canPhagocytose(target)) {
      startPhagocytosis(state, entity, target);
      entity.attackCooldownRemainingMs =
        entity.attackCooldownMs + balanceValues.combat.macrophagePhagocytosisDurationMs;
      continue;
    }

    target.health -= calculateDamage(state, entity, target);
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
      kind: isPlasmocyte(entity) ? "antibody" : "attack",
      position: { ...target.position },
      radius: target.radius + balanceValues.attackEffectRadiusBonus,
      ttlMs: balanceValues.attackEffectTtlMs,
    });
    state.nextEffectNumber += 1;
  }

}

function processPhagocytosis(state: GameState, deltaMs: number): void {
  for (const bacterium of Object.values(state.entities).filter(isBacterium)) {
    if (!bacterium.phagocytosedByEntityId || !bacterium.phagocytosisRemainingMs) {
      continue;
    }

    const macrophage = state.entities[bacterium.phagocytosedByEntityId];

    if (!macrophage || !isMacrophage(macrophage)) {
      bacterium.phagocytosedByEntityId = undefined;
      bacterium.phagocytosisRemainingMs = 0;
      continue;
    }

    bacterium.immobilizedRemainingMs = Math.max(
      bacterium.immobilizedRemainingMs ?? 0,
      deltaMs + 80,
    );
    bacterium.phagocytosisRemainingMs = Math.max(
      0,
      bacterium.phagocytosisRemainingMs - deltaMs,
    );

    if (bacterium.phagocytosisRemainingMs <= 0) {
      bacterium.health = 0;
      state.effects.push({
        id: `effect-${state.nextEffectNumber}`,
        kind: "phagocytosis",
        position: { ...bacterium.position },
        radius: bacterium.radius + balanceValues.attackEffectRadiusBonus + 6,
        ttlMs: balanceValues.attackEffectTtlMs * 2,
      });
      state.nextEffectNumber += 1;
    }
  }
}

function canPhagocytose(target: BacteriumEntity): boolean {
  return (
    !target.phagocytosedByEntityId &&
    target.health <= balanceValues.combat.macrophagePhagocytosisMaxHealth &&
    target.maxHealth <= balanceValues.combat.macrophagePhagocytosisMaxHealth
  );
}

function startPhagocytosis(
  state: GameState,
  macrophage: ImmuneUnitEntity,
  target: BacteriumEntity,
): void {
  target.phagocytosedByEntityId = macrophage.id;
  target.phagocytosisRemainingMs = balanceValues.combat.macrophagePhagocytosisDurationMs;
  target.immobilizedRemainingMs = balanceValues.combat.macrophagePhagocytosisDurationMs;
  state.inflammation.value = Math.min(
    balanceValues.inflammation.maxValue,
    state.inflammation.value + balanceValues.inflammation.combatIncrease,
  );
  addInflammatoryZone(state, macrophage, target);
  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    kind: "phagocytosis",
    position: { ...target.position },
    radius: target.radius + balanceValues.attackEffectRadiusBonus,
    ttlMs: balanceValues.attackEffectTtlMs * 2,
  });
  state.nextEffectNumber += 1;
}

function findNearestBacteriumInRange(
  immuneUnit: ImmuneUnitEntity,
  bacteria: BacteriumEntity[],
): BacteriumEntity | null {
  let nearest: BacteriumEntity | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestPriority = Number.NEGATIVE_INFINITY;
  const maxDistanceSquared = immuneUnit.attackRange * immuneUnit.attackRange;

  for (const bacterium of bacteria) {
    if (bacterium.phagocytosedByEntityId) {
      continue;
    }

    const currentDistance = distanceSquared(immuneUnit.position, bacterium.position);
    const definition = pathogenDefinitions[bacterium.pathogenTypeId];
    const currentPriority = bacterium.targetPriority ?? definition.targetPriority;

    if (
      currentDistance <= maxDistanceSquared &&
      (currentPriority > nearestPriority ||
        (currentPriority === nearestPriority && currentDistance < nearestDistance))
    ) {
      nearest = bacterium;
      nearestDistance = currentDistance;
      nearestPriority = currentPriority;
    }
  }

  return nearest;
}

function calculateDamage(
  state: GameState,
  immuneUnit: ImmuneUnitEntity,
  target: BacteriumEntity,
): number {
  const definition = pathogenDefinitions[target.pathogenTypeId];
  const unitMultiplier = definition.damageMultipliers[immuneUnit.kind] ?? 1;
  const analysisMultiplier = state.adaptiveResearch.bacterialAnalysisComplete
    ? balanceValues.adaptive.bacterialAnalysisDamageMultiplier
    : 1;
  const inflammationMultiplier = getInflammationDamageMultiplier(state, immuneUnit);
  const rawDamage =
    immuneUnit.attackDamage *
    unitMultiplier *
    (isMacrophage(immuneUnit)
      ? balanceValues.combat.macrophageCleanupDamageMultiplier
      : 1) *
    analysisMultiplier *
    inflammationMultiplier;
  const armoredDamage = Math.max(
    balanceValues.combat.minimumDamageAfterArmor,
    rawDamage - (target.armor ?? definition.armor),
  );

  return armoredDamage * getBiofilmDamageMultiplier(state, target);
}

function getBiofilmDamageMultiplier(
  state: GameState,
  target: BacteriumEntity,
): number {
  return state.biofilmZones.reduce((multiplier, zone) => {
    if (distance(zone.position, target.position) > zone.radius) {
      return multiplier;
    }

    const sourceMultiplier =
      zone.sourceEntityId === target.id
        ? balanceValues.combat.biofilmSameSourceProtectionMultiplier
        : 1;

    return Math.min(multiplier, zone.damageTakenMultiplier * sourceMultiplier);
  }, 1);
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
