import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { pathogenDefinitions } from "../../data/pathogens";
import { distance, stableHash } from "../../types/shared";
import type { GameState } from "../core/GameState";
import {
  isBacterium,
  isControllableImmuneUnit,
  type BacteriumEntity,
} from "../entities";
import { spawnBacterium } from "../pathogens/createBacterium";
import { canSpawnPathogen } from "./entityLimitSystem";
import { getRuntimeMapBalance } from "./runtimeMapBalance";

export function applyTissueSystem(state: GameState, deltaMs: number): void {
  const mission = missionDefinitions[state.missionId];
  const mapBalance = getRuntimeMapBalance(state);
  const tissueFocus = state.tacticalMap.combatSites[0]?.position ?? mission.map.tissueCore;

  for (const entity of Object.values(state.entities)) {
    if (!isBacterium(entity)) {
      continue;
    }

    entity.attackCooldownRemainingMs = Math.max(
      0,
      entity.attackCooldownRemainingMs - deltaMs,
    );
    entity.duplicationCooldownMs = Math.max(
      0,
      (entity.duplicationCooldownMs ?? 0) - deltaMs,
    );

    if (entity.attackCooldownRemainingMs > 0) {
      continue;
    }

    const immuneTarget = findNearestImmuneUnitTarget(state, entity.position);
    const tissueDamage = entity.tissueDamage * mapBalance.pathogenDamageMultiplier;

    if (
      immuneTarget &&
      distance(entity.position, immuneTarget.position) <=
        entity.tissueAttackRange + immuneTarget.radius
    ) {
      immuneTarget.health = Math.max(
        0,
        immuneTarget.health -
          tissueDamage *
            balanceValues.combat.bacteriumContactImmuneDamageMultiplier,
      );
      state.effects.push({
        id: `effect-${state.nextEffectNumber}`,
        kind: "attack",
        position: { ...immuneTarget.position },
        radius: immuneTarget.radius + balanceValues.attackEffectRadiusBonus,
        ttlMs: balanceValues.attackEffectTtlMs,
      });
      state.nextEffectNumber += 1;
      entity.attackCooldownRemainingMs = entity.attackCooldownMs;
      tryDuplicateBacteriumAfterAttack(state, entity);
      continue;
    }

    const targetCell = findNearestAttackableTissueCell(state, entity.position);

    if (
      targetCell &&
      distance(entity.position, targetCell.position) <=
        entity.tissueAttackRange + targetCell.radius
    ) {
      targetCell.health = Math.max(0, targetCell.health - tissueDamage);
      state.tissue.health = Math.max(
        0,
        state.tissue.health -
          tissueDamage *
            balanceValues.tissueCells.directHitTissueDamageMultiplier,
      );

      if (targetCell.health <= 0 && targetCell.status !== "destroyed") {
        targetCell.status = "destroyed";
        state.tissue.health = Math.max(
          0,
          state.tissue.health - balanceValues.tissueCells.destroyedTissueDamage,
        );
      }
    } else if (
      distance(entity.position, tissueFocus) <= entity.tissueAttackRange
    ) {
      state.tissue.health = Math.max(0, state.tissue.health - tissueDamage);
    } else {
      continue;
    }

    entity.attackCooldownRemainingMs = entity.attackCooldownMs;
    tryDuplicateBacteriumAfterAttack(state, entity);
    state.effects.push({
      id: `effect-${state.nextEffectNumber}`,
      kind: "tissueDamage",
      position: { ...tissueFocus },
      radius: balanceValues.tissueDamageEffectRadius,
      ttlMs: balanceValues.tissueDamageEffectTtlMs,
    });
    state.nextEffectNumber += 1;
  }
}

function tryDuplicateBacteriumAfterAttack(
  state: GameState,
  bacterium: BacteriumEntity,
): void {
  const duplication = balanceValues.bacterialDuplication;
  const definition = pathogenDefinitions[bacterium.pathogenTypeId];

  if (definition.specialBehavior !== "proliferator") {
    return;
  }

  if (!canSpawnPathogen(state, bacterium.pathogenTypeId)) {
    return;
  }

  if ((bacterium.duplicationCooldownMs ?? 0) > 0) {
    return;
  }

  if (
    (bacterium.attackCloneGeneration ?? 0) >= duplication.maxCloneGenerations ||
    (bacterium.attackClonesCreated ?? 0) >= duplication.maxClonesPerBacterium
  ) {
    return;
  }

  const seed = stableHash(
    `${bacterium.id}-${state.elapsedMs}-${state.nextEntityNumber}-attack-duplication`,
  );
  const roll = (seed % 1000) / 1000;

  if (roll >= duplication.onAttackChance) {
    return;
  }

  const angle = ((seed % 360) * Math.PI) / 180;
  const radius = bacterium.radius + 18 + (seed % 18);
  const position = clampToWorld(
    state,
    {
      x: bacterium.position.x + Math.cos(angle) * radius,
      y: bacterium.position.y + Math.sin(angle) * radius,
    },
    bacterium.radius + 8,
  );
  const child = spawnBacterium(state, bacterium.pathogenTypeId, position);

  bacterium.attackClonesCreated = (bacterium.attackClonesCreated ?? 0) + 1;
  bacterium.duplicationCooldownMs = duplication.cooldownMs;
  child.attackCloneGeneration = (bacterium.attackCloneGeneration ?? 0) + 1;
  child.health = Math.max(1, child.maxHealth * duplication.cloneHealthMultiplier);
  child.tissueDamage *= duplication.cloneDamageMultiplier;
  child.duplicationCooldownMs = duplication.cooldownMs;
  child.attackCooldownRemainingMs = Math.max(
    child.attackCooldownMs * duplication.cloneInitialAttackDelayMultiplier,
    duplication.cloneMinimumInitialAttackDelayMs,
  );
}

function clampToWorld(
  state: GameState,
  position: { x: number; y: number },
  padding: number,
): { x: number; y: number } {
  return {
    x: Math.max(padding, Math.min(state.tacticalMap.worldWidth - padding, position.x)),
    y: Math.max(padding, Math.min(state.tacticalMap.worldHeight - padding, position.y)),
  };
}

function findNearestImmuneUnitTarget(
  state: GameState,
  position: { x: number; y: number },
) {
  let nearest = null as GameState["entities"][string] | null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const entity of Object.values(state.entities)) {
    if (!isControllableImmuneUnit(entity)) {
      continue;
    }

    const currentDistance = distance(position, entity.position);

    if (currentDistance < nearestDistance) {
      nearest = entity;
      nearestDistance = currentDistance;
    }
  }

  return nearest && isControllableImmuneUnit(nearest) ? nearest : null;
}

function findNearestAttackableTissueCell(
  state: GameState,
  position: { x: number; y: number },
) {
  let nearest = null as GameState["tissueCells"][number] | null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const cell of state.tissueCells) {
    if (cell.status === "destroyed") {
      continue;
    }

    const currentDistance = distance(position, cell.position);

    if (currentDistance < nearestDistance) {
      nearest = cell;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}
