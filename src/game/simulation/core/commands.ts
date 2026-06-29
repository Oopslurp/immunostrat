import { missionDefinitions } from "../../data/missions";
import { unitDefinitions } from "../../data/units";
import type { EntityId, Vector2 } from "../../types/shared";
import { createInitialState } from "./createInitialState";
import type { GameState } from "./GameState";
import { cloneState } from "./cloneState";

export type GameCommand =
  | { type: "produceMacrophage" }
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
    return produceMacrophage(state);
  }

  if (command.type === "selectEntity") {
    const next = cloneState(state);
    const entity = command.entityId ? next.entities[command.entityId] : null;
    next.selectedEntityIds =
      entity?.kind === "macrophage" && command.entityId ? [command.entityId] : [];

    return next;
  }

  if (command.type === "selectEntities") {
    const next = cloneState(state);
    next.selectedEntityIds = command.entityIds.filter(
      (entityId) => next.entities[entityId]?.kind === "macrophage",
    );

    return next;
  }

  if (command.type === "orderMove") {
    const next = cloneState(state);

    for (const entityId of next.selectedEntityIds) {
      const selected = next.entities[entityId];

      if (selected?.kind === "macrophage") {
        selected.targetPosition = { ...command.position };
        selected.idleTargetPosition = null;
      }
    }

    return next;
  }

  return state;
}

function produceMacrophage(state: GameState): GameState {
  const definition = unitDefinitions.macrophage;

  if (state.resources.atp < definition.atpCost) {
    return state;
  }

  const mission = missionDefinitions[state.missionId];
  const next = cloneState(state);
  const id = `macrophage-${next.nextEntityNumber}`;

  next.nextEntityNumber += 1;
  next.resources.atp = Math.max(0, next.resources.atp - definition.atpCost);
  next.entities[id] = {
    id,
    kind: "macrophage",
    unitTypeId: "macrophage",
    position: { ...mission.map.macrophageSpawn },
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
  next.selectedEntityIds = [id];

  return next;
}
