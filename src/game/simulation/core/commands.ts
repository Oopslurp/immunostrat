import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { unitDefinitions, type UnitTypeId } from "../../data/units";
import type { EntityId, Vector2 } from "../../types/shared";
import { isImmuneUnit } from "../entities";
import { createInitialState } from "./createInitialState";
import type { GameState } from "./GameState";
import { cloneState } from "./cloneState";

export type GameCommand =
  | { type: "produceMacrophage" }
  | { type: "produceNeutrophil" }
  | { type: "selectEntity"; entityId: EntityId | null }
  | { type: "selectEntities"; entityIds: EntityId[] }
  | { type: "orderMove"; position: Vector2 }
  | { type: "restart" };

export function applyCommand(state: GameState, command: GameCommand): GameState {
  if (command.type === "restart") {
    return createInitialState(state.missionId);
  }

  if (state.status !== "running") {
    return state;
  }

  if (command.type === "produceMacrophage") {
    return produceImmuneUnit(state, "macrophage");
  }

  if (command.type === "produceNeutrophil") {
    return produceImmuneUnit(state, "neutrophil");
  }

  if (command.type === "selectEntity") {
    const next = cloneState(state);
    const entity = command.entityId ? next.entities[command.entityId] : null;
    next.selectedEntityIds =
      entity && isImmuneUnit(entity) && command.entityId ? [command.entityId] : [];

    return next;
  }

  if (command.type === "selectEntities") {
    const next = cloneState(state);
    next.selectedEntityIds = command.entityIds.filter(
      (entityId) => {
        const entity = next.entities[entityId];

        return entity ? isImmuneUnit(entity) : false;
      },
    );

    return next;
  }

  if (command.type === "orderMove") {
    const next = cloneState(state);

    for (const entityId of next.selectedEntityIds) {
      const selected = next.entities[entityId];

      if (selected && isImmuneUnit(selected)) {
        selected.targetPosition = { ...command.position };
        selected.idleTargetPosition = null;
      }
    }

    return next;
  }

  return state;
}

function produceImmuneUnit(state: GameState, unitTypeId: UnitTypeId): GameState {
  const definition = unitDefinitions[unitTypeId];

  if (
    state.resources.atp < definition.atpCost ||
    state.resources.cytokines < definition.cytokineCost
  ) {
    return state;
  }

  if (
    unitTypeId === "neutrophil" &&
    state.productionCooldowns.neutrophilMs > 0
  ) {
    return state;
  }

  const mission = missionDefinitions[state.missionId];
  const next = cloneState(state);
  const id = `${unitTypeId}-${next.nextEntityNumber}`;

  next.nextEntityNumber += 1;
  next.resources.atp = Math.max(0, next.resources.atp - definition.atpCost);
  next.resources.cytokines = Math.max(
    0,
    next.resources.cytokines - definition.cytokineCost,
  );
  next.entities[id] = {
    id,
    kind: unitTypeId,
    unitTypeId,
    position: {
      ...(unitTypeId === "neutrophil"
        ? definition.spawnPosition
        : mission.map.macrophageSpawn),
    },
    targetPosition: null,
    idleTargetPosition: null,
    nextIdleRetargetMs: state.elapsedMs + 1200,
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    radius: definition.radius,
    movementSpeed: definition.movementSpeed,
    idleMovementSpeed: definition.idleMovementSpeed,
    attackRange: definition.attackRange,
    attackDamage: definition.attackDamage,
    attackCooldownMs: definition.attackCooldownMs,
    attackCooldownRemainingMs: 0,
  };

  if (unitTypeId === "neutrophil") {
    next.productionCooldowns.neutrophilMs =
      balanceValues.neutrophilProductionCooldownMs;
    next.inflammation.value = Math.min(
      balanceValues.inflammation.maxValue,
      next.inflammation.value + balanceValues.inflammation.neutrophilSpawnIncrease,
    );
  }

  next.selectedEntityIds = [id];

  return next;
}
