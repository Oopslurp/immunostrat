import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { distance, moveToward, stableHash, type Vector2 } from "../../types/shared";
import type { GameState } from "../core/GameState";
import {
  isBacterium,
  isDendriticCell,
  isImmuneUnit,
  isNeutrophil,
  type ImmuneUnitEntity,
} from "../entities";
import { getRuntimeMapBalance } from "./runtimeMapBalance";

export function applyMovementSystem(state: GameState, deltaMs: number): void {
  const mission = missionDefinitions[state.missionId];
  const maxMoveScale = deltaMs / 1000;
  const mapBalance = getRuntimeMapBalance(state);

  for (const entity of Object.values(state.entities)) {
    if (isImmuneUnit(entity)) {
      if (entity.health <= 0) {
        continue;
      }

      if (isNeutrophil(entity) && entity.deathState) {
        continue;
      }

      if (
        isDendriticCell(entity) &&
        entity.lymphTransit?.phase === "away"
      ) {
        continue;
      }

      const anchor = entity.orderAnchor ?? entity.targetPosition ?? entity.position;
      const leashRadius = entity.leashRadius ?? entity.attackRange + 120;

      if (
        entity.tacticalState === "engagingNearbyTarget" &&
        distance(entity.position, anchor) > leashRadius
      ) {
        entity.targetPosition = { ...anchor };
        entity.explicitTargetEntityId = null;
        entity.idleTargetPosition = null;
        entity.tacticalState = "movingToPoint";
        entity.lastOrderFeedback = "Retour a la zone d'ordre";
      }

      if (entity.targetPosition) {
        const biofilmSlowMultiplier = getBiofilmSlowMultiplier(state, entity.position);
        entity.position = moveToward(
          entity.position,
          entity.targetPosition,
          entity.movementSpeed *
            mapBalance.unitTravelCompensation *
            biofilmSlowMultiplier *
            maxMoveScale,
        );

        if (distance(entity.position, entity.targetPosition) <= 2) {
          entity.targetPosition = null;
          entity.nextIdleRetargetMs = state.elapsedMs + balanceValues.idleRetargetAfterMoveMs;
          if (entity.tacticalState === "retreating") {
            entity.tacticalState = "holdingPosition";
          } else if (
            entity.tacticalState === "movingToPoint" ||
            entity.tacticalState === "movingToSite" ||
            entity.tacticalState === "engagingNearbyTarget"
          ) {
            entity.tacticalState = "guardingArea";
          }
        }
      } else if (
        entity.tacticalState !== "holdingPosition" &&
        entity.tacticalState !== "deliveringToLymph" &&
        entity.tacticalState !== "inLymphTransit" &&
        entity.tacticalState !== "collectingAntigen"
      ) {
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

      const target = getNearestPathogenPressureTarget(state, entity.position) ?? mission.map.tissueCore;

      if (distance(entity.position, target) > entity.tissueAttackRange) {
        const slowMultiplier = isInInflammatoryZone(state, entity.position)
          ? balanceValues.inflammation.zoneBacteriaSlowMultiplier
          : 1;

        entity.position = moveToward(
          entity.position,
          target,
          entity.movementSpeed *
            slowMultiplier *
            (entity.netMovementMultiplier ?? 1) *
            maxMoveScale,
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
    immuneUnit.idleTargetPosition = createIdleTarget(state, immuneUnit);
    immuneUnit.nextIdleRetargetMs =
      state.elapsedMs +
      balanceValues.idleRetargetBaseMs +
      (stableHash(immuneUnit.id) % balanceValues.idleRetargetSpreadMs);
  }

  immuneUnit.position = moveToward(
    immuneUnit.position,
    immuneUnit.idleTargetPosition,
    immuneUnit.idleMovementSpeed *
      getRuntimeMapBalance(state).unitTravelCompensation *
      getBiofilmSlowMultiplier(state, immuneUnit.position) *
      maxMoveScale,
  );
}

function getNearestPathogenPressureTarget(
  state: GameState,
  position: Vector2,
): Vector2 | null {
  const nearestCell = state.tissueCells
    .filter((cell) => cell.status !== "destroyed")
    .sort((a, b) => distance(a.position, position) - distance(b.position, position))[0];

  if (nearestCell) {
    return nearestCell.position;
  }

  const nearestSite = [...state.tacticalMap.combatSites].sort(
    (a, b) => distance(a.position, position) - distance(b.position, position),
  )[0];

  return nearestSite?.position ?? null;
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

function createIdleTarget(state: GameState, entity: ImmuneUnitEntity): Vector2 {
  const mission = missionDefinitions[state.missionId];
  const seed = stableHash(`${entity.id}-${Math.floor(state.elapsedMs / 1000)}`);
  const angle = (seed % 360) * (Math.PI / 180);
  const radius =
    entity.tacticalState === "guardingArea"
      ? Math.max(8, seed % (entity.guardRadius ?? 42))
      : balanceValues.idleMinRadius + (seed % balanceValues.idleRadiusSpread);
  const anchor =
    entity.tacticalState === "guardingArea" && entity.orderAnchor
      ? entity.orderAnchor
      : entity.position;
  const bounds = balanceValues.idleBoundsPadding;

  return {
    x: clamp(
      anchor.x + Math.cos(angle) * radius,
      bounds.left,
      mission.map.bacteriaEntryZone.x - bounds.rightFromEntry,
    ),
    y: clamp(
      anchor.y + Math.sin(angle) * radius,
      bounds.top,
      mission.map.height - bounds.bottom,
    ),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
