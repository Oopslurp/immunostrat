import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { distance, moveToward, stableHash, type Vector2 } from "../../types/shared";
import type { GameState } from "../core/GameState";
import { isBacterium, isImmuneUnit, type ImmuneUnitEntity } from "../entities";

export function applyMovementSystem(state: GameState, deltaMs: number): void {
  const mission = missionDefinitions[state.missionId];
  const maxMoveScale = deltaMs / 1000;

  for (const entity of Object.values(state.entities)) {
    if (isImmuneUnit(entity)) {
      if (entity.targetPosition) {
        const biofilmSlowMultiplier = getBiofilmSlowMultiplier(state, entity.position);
        entity.position = moveToward(
          entity.position,
          entity.targetPosition,
          entity.movementSpeed * biofilmSlowMultiplier * maxMoveScale,
        );

        if (distance(entity.position, entity.targetPosition) <= 2) {
          entity.targetPosition = null;
          entity.nextIdleRetargetMs =
            state.elapsedMs + balanceValues.idleRetargetAfterMoveMs;
        }
      } else {
        applyIdleMovement(state, entity, maxMoveScale);
      }
    }

    if (isBacterium(entity)) {
      entity.immobilizedRemainingMs = Math.max(
        0,
        (entity.immobilizedRemainingMs ?? 0) - deltaMs,
      );

      if ((entity.immobilizedRemainingMs ?? 0) > 0) {
        continue;
      }

      const target = mission.map.tissueCore;

      if (distance(entity.position, target) > entity.tissueAttackRange) {
        const slowMultiplier = isInInflammatoryZone(state, entity.position)
          ? balanceValues.inflammation.zoneBacteriaSlowMultiplier
          : 1;

        entity.position = moveToward(
          entity.position,
          target,
          entity.movementSpeed * slowMultiplier * maxMoveScale,
        );
      }
    }
  }
}

function applyIdleMovement(
  state: GameState,
  immuneUnit: ImmuneUnitEntity,
  maxMoveScale: number,
): void {
  if (
    !immuneUnit.idleTargetPosition ||
    state.elapsedMs >= immuneUnit.nextIdleRetargetMs ||
    distance(immuneUnit.position, immuneUnit.idleTargetPosition) <= 3
  ) {
    immuneUnit.idleTargetPosition = createIdleTarget(state, immuneUnit.id);
    immuneUnit.nextIdleRetargetMs =
      state.elapsedMs +
      balanceValues.idleRetargetBaseMs +
      (stableHash(immuneUnit.id) % balanceValues.idleRetargetSpreadMs);
  }

  immuneUnit.position = moveToward(
    immuneUnit.position,
    immuneUnit.idleTargetPosition,
    immuneUnit.idleMovementSpeed *
      getBiofilmSlowMultiplier(state, immuneUnit.position) *
      maxMoveScale,
  );
}

function getBiofilmSlowMultiplier(state: GameState, position: Vector2): number {
  return state.biofilmZones.reduce((multiplier, zone) => {
    if (distance(zone.position, position) > zone.radius) {
      return multiplier;
    }

    return Math.min(multiplier, zone.immuneSlowMultiplier);
  }, 1);
}

function isInInflammatoryZone(state: GameState, position: Vector2): boolean {
  return state.inflammatoryZones.some(
    (zone) => distance(zone.position, position) <= zone.radius,
  );
}

function createIdleTarget(state: GameState, entityId: string): Vector2 {
  const mission = missionDefinitions[state.missionId];
  const seed = stableHash(`${entityId}-${Math.floor(state.elapsedMs / 1000)}`);
  const angle = (seed % 360) * (Math.PI / 180);
  const radius =
    balanceValues.idleMinRadius + (seed % balanceValues.idleRadiusSpread);
  const entity = state.entities[entityId];
  const current = entity.position;
  const bounds = balanceValues.idleBoundsPadding;

  return {
    x: clamp(
      current.x + Math.cos(angle) * radius,
      bounds.left,
      mission.map.bacteriaEntryZone.x - bounds.rightFromEntry,
    ),
    y: clamp(
      current.y + Math.sin(angle) * radius,
      bounds.top,
      mission.map.height - bounds.bottom,
    ),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
