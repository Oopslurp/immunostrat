import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { pathogenDefinitions, type PathogenTypeId } from "../../data/pathogens";
import { distance, moveToward, stableHash, type Vector2 } from "../../types/shared";
import type { GameState, TissueCellState } from "../core/GameState";
import {
  isAdvancedThreat,
  isCytotoxicT,
  isImmuneUnit,
  isNkCell,
  type AdvancedThreatEntity,
} from "../entities";
import { spawnAdvancedThreat } from "../pathogens/createAdvancedThreat";
import { spawnBacterium } from "../pathogens/createBacterium";
import { spawnVirus } from "../pathogens/createVirus";
import { canSpawnPathogen } from "./entityLimitSystem";
import { getRuntimeMapBalance } from "./runtimeMapBalance";

export function applyAdvancedThreatSystem(
  state: GameState,
  deltaMs: number,
): void {
  const mission = missionDefinitions[state.missionId];
  const seconds = deltaMs / 1000;
  const mapBalance = getRuntimeMapBalance(state);

  for (const entity of Object.values(state.entities).filter(isAdvancedThreat)) {
    if (entity.health <= 0) {
      continue;
    }

    updateCancerDetection(state, entity);
    updateAdvancedSpawn(state, entity, deltaMs);
    updateAdvancedMovement(state, entity, deltaMs);
    updateAdvancedAttack(state, entity, deltaMs);

    if (entity.category === "fungus") {
      state.inflammation.value = Math.min(
        balanceValues.inflammation.maxValue,
        state.inflammation.value +
          0.18 * mapBalance.inflammationGainMultiplier * seconds,
      );
      if (
        distance(
          entity.position,
          getNearestPressureTarget(state, entity.position, mission.map.tissueCore),
        ) <= 180
      ) {
        state.tissue.health = Math.max(
          0,
          state.tissue.health -
            0.22 *
              mapBalance.advancedPassiveDamageMultiplier *
              mapBalance.pathogenDamageMultiplier *
              seconds,
        );
      }
    }

    if (entity.category === "parasite") {
      state.inflammation.value = Math.min(
        balanceValues.inflammation.maxValue,
        state.inflammation.value +
          0.5 * mapBalance.inflammationGainMultiplier * seconds,
      );
    }

    if (entity.category === "cancerCell") {
      state.tissue.health = Math.max(
        0,
        state.tissue.health -
          0.18 *
            mapBalance.advancedPassiveDamageMultiplier *
            mapBalance.pathogenDamageMultiplier *
            seconds,
      );
    }
  }
}

function updateCancerDetection(
  state: GameState,
  entity: AdvancedThreatEntity,
): void {
  if (entity.category !== "cancerCell" || entity.detected) {
    return;
  }

  const detector = Object.values(state.entities)
    .filter(isImmuneUnit)
    .find(
      (immuneUnit) =>
        (isNkCell(immuneUnit) || isCytotoxicT(immuneUnit)) &&
        distance(immuneUnit.position, entity.position) <= 150,
    );

  if (detector) {
    entity.detected = true;
    state.effects.push({
      id: `effect-${state.nextEffectNumber}`,
      kind: "cytotoxic",
      position: { ...entity.position },
      radius: entity.radius + 24,
      ttlMs: balanceValues.attackEffectTtlMs * 2,
    });
    state.nextEffectNumber += 1;
  }
}

function updateAdvancedSpawn(
  state: GameState,
  entity: AdvancedThreatEntity,
  deltaMs: number,
): void {
  const definition = pathogenDefinitions[entity.pathogenTypeId];
  const spreadRateMultiplier = getRuntimeMapBalance(state).spreadRateMultiplier;

  if (!definition.spawn) {
    return;
  }

  entity.specialCooldownRemainingMs = Math.max(
    0,
    entity.specialCooldownRemainingMs - deltaMs * spreadRateMultiplier,
  );

  if (
    entity.specialCooldownRemainingMs > 0 ||
    entity.spawnedChildrenCount >= definition.spawn.maxChildren
  ) {
    return;
  }

  const childTypeId = definition.spawn.childTypeId as PathogenTypeId;

  if (!canSpawnAdvancedChild(state, childTypeId)) {
    entity.specialCooldownRemainingMs = definition.spawn.intervalMs;
    return;
  }

  spawnChild(
    state,
    childTypeId,
    createChildPosition(
      entity.position,
      definition.spawn.spawnRadius,
      `${entity.id}-${entity.spawnedChildrenCount}`,
    ),
  );
  entity.spawnedChildrenCount += 1;
  entity.specialCooldownRemainingMs = definition.spawn.intervalMs;
}

function updateAdvancedMovement(
  state: GameState,
  entity: AdvancedThreatEntity,
  deltaMs: number,
): void {
  const mission = missionDefinitions[state.missionId];
  const target =
    entity.category === "cancerCell"
      ? findNearestTissueCell(state, entity.position)?.position ?? mission.map.tissueCore
      : getNearestPressureTarget(state, entity.position, mission.map.tissueCore);

  if (distance(entity.position, target) <= entity.tissueAttackRange) {
    return;
  }

  entity.position = moveToward(
    entity.position,
    target,
    entity.movementSpeed * (deltaMs / 1000),
  );
}

function updateAdvancedAttack(
  state: GameState,
  entity: AdvancedThreatEntity,
  deltaMs: number,
): void {
  const mission = missionDefinitions[state.missionId];
  const mapBalance = getRuntimeMapBalance(state);
  const tissueDamage = entity.tissueDamage * mapBalance.pathogenDamageMultiplier;

  entity.attackCooldownRemainingMs = Math.max(
    0,
    entity.attackCooldownRemainingMs - deltaMs,
  );

  if (entity.attackCooldownRemainingMs > 0) {
    return;
  }

  const immuneTarget = Object.values(state.entities)
    .filter(isImmuneUnit)
    .sort(
      (a, b) =>
        distance(a.position, entity.position) - distance(b.position, entity.position),
    )[0];

  if (
    immuneTarget &&
    distance(entity.position, immuneTarget.position) <=
      entity.tissueAttackRange + immuneTarget.radius
  ) {
    immuneTarget.health = Math.max(
      0,
      immuneTarget.health - tissueDamage * 0.7,
    );
  } else {
    const targetCell = findNearestTissueCell(state, entity.position);

    if (
      targetCell &&
      distance(entity.position, targetCell.position) <=
        entity.tissueAttackRange + targetCell.radius
    ) {
      targetCell.health = Math.max(0, targetCell.health - tissueDamage);
      state.tissue.health = Math.max(0, state.tissue.health - tissueDamage * 0.5);

      if (targetCell.health <= 0) {
        targetCell.status = "destroyed";
      }
    } else if (
      distance(
        entity.position,
        getNearestPressureTarget(state, entity.position, mission.map.tissueCore),
      ) <= entity.tissueAttackRange
    ) {
      state.tissue.health = Math.max(0, state.tissue.health - tissueDamage * 0.65);
    } else {
      return;
    }
  }

  entity.attackCooldownRemainingMs = entity.attackCooldownMs;
  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    kind: "tissueDamage",
    position: { ...entity.position },
    radius: entity.radius + balanceValues.attackEffectRadiusBonus,
    ttlMs: balanceValues.attackEffectTtlMs,
  });
  state.nextEffectNumber += 1;
}

function getNearestPressureTarget(
  state: GameState,
  position: Vector2,
  fallback: Vector2,
): Vector2 {
  const cell = findNearestTissueCell(state, position);

  if (cell) {
    return cell.position;
  }

  const site = [...state.tacticalMap.combatSites].sort(
    (a, b) => distance(a.position, position) - distance(b.position, position),
  )[0];

  return site?.position ?? fallback;
}

function findNearestTissueCell(
  state: GameState,
  position: Vector2,
): TissueCellState | null {
  let nearest: TissueCellState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const cell of state.tissueCells) {
    if (cell.status === "destroyed") {
      continue;
    }

    const currentDistance = distance(cell.position, position);

    if (currentDistance < nearestDistance) {
      nearest = cell;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}

function canSpawnAdvancedChild(
  state: GameState,
  pathogenTypeId: PathogenTypeId,
): boolean {
  return canSpawnPathogen(state, pathogenTypeId);
}

function spawnChild(
  state: GameState,
  pathogenTypeId: PathogenTypeId,
  position: Vector2,
): void {
  const definition = pathogenDefinitions[pathogenTypeId];

  if (definition.pathogenClass === "bacterium") {
    spawnBacterium(state, pathogenTypeId, position);
    return;
  }

  if (definition.pathogenClass === "virus") {
    spawnVirus(state, pathogenTypeId, position);
    return;
  }

  spawnAdvancedThreat(state, pathogenTypeId, position);
}

function createChildPosition(
  origin: Vector2,
  radius: number,
  seedInput: string,
): Vector2 {
  const seed = stableHash(seedInput);
  const angle = (seed % 360) * (Math.PI / 180);
  const childDistance = radius * (0.3 + (seed % 60) / 100);

  return {
    x: origin.x + Math.cos(angle) * childDistance,
    y: origin.y + Math.sin(angle) * childDistance,
  };
}
