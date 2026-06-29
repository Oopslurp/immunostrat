import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { distance, moveToward, type Vector2 } from "../../types/shared";
import type { GameState } from "../core/GameState";
import { isBacterium, isMacrophage, type MacrophageEntity } from "../entities";

export function applyMovementSystem(state: GameState, deltaMs: number): void {
  const mission = missionDefinitions[state.missionId];
  const maxMoveScale = deltaMs / 1000;

  for (const entity of Object.values(state.entities)) {
    if (isMacrophage(entity)) {
      if (entity.targetPosition) {
        entity.position = moveToward(
          entity.position,
          entity.targetPosition,
          entity.movementSpeed * maxMoveScale,
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
      const target = mission.map.tissueCore;

      if (distance(entity.position, target) > entity.tissueAttackRange) {
        entity.position = moveToward(
          entity.position,
          target,
          entity.movementSpeed * maxMoveScale,
        );
      }
    }
  }
}

function applyIdleMovement(
  state: GameState,
  macrophage: MacrophageEntity,
  maxMoveScale: number,
): void {
  if (
    !macrophage.idleTargetPosition ||
    state.elapsedMs >= macrophage.nextIdleRetargetMs ||
    distance(macrophage.position, macrophage.idleTargetPosition) <= 3
  ) {
    macrophage.idleTargetPosition = createIdleTarget(state, macrophage.id);
    macrophage.nextIdleRetargetMs =
      state.elapsedMs +
      balanceValues.idleRetargetBaseMs +
      (stableHash(macrophage.id) % balanceValues.idleRetargetSpreadMs);
  }

  macrophage.position = moveToward(
    macrophage.position,
    macrophage.idleTargetPosition,
    macrophage.idleMovementSpeed * maxMoveScale,
  );
}

function createIdleTarget(
  state: GameState,
  entityId: string,
): Vector2 {
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

function stableHash(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
