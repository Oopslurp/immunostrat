import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { pathogenDefinitions } from "../../data/pathogens";
import { distance } from "../../types/shared";
import type { GameState, PathogenDebris } from "../core/GameState";
import { isBacterium, isDendriticCell, type BacteriumEntity } from "../entities";

export function applyDebrisSystem(state: GameState, deltaMs: number): void {
  decayDebris(state, deltaMs);
  convertDeadBacteriaToDebris(state);
  processDendriticCells(state);
}

function decayDebris(state: GameState, deltaMs: number): void {
  state.debris = state.debris
    .map((debris) => ({
      ...debris,
      ttlMs: debris.ttlMs - deltaMs,
    }))
    .filter((debris) => debris.ttlMs > 0);
}

function convertDeadBacteriaToDebris(state: GameState): void {
  for (const [id, entity] of Object.entries(state.entities)) {
    if (!isBacterium(entity) || entity.health > 0) {
      continue;
    }

    if (shouldDropDebris(state, entity, id)) {
      state.debris.push(createDebris(state, entity));
    }

    delete state.entities[id];
  }
}

function processDendriticCells(state: GameState): void {
  const mission = missionDefinitions[state.missionId];
  const lymphNode = mission.map.lymphNode;
  const adaptive = balanceValues.adaptive;

  for (const entity of Object.values(state.entities)) {
    if (!isDendriticCell(entity)) {
      continue;
    }

    if (
      entity.carriedDebrisCount > 0 &&
      distance(entity.position, lymphNode) <= adaptive.lymphNodeRange
    ) {
      state.resources.antigens = Math.min(
        balanceValues.maxAntigens,
        state.resources.antigens + entity.carriedAntigenValue,
      );
      entity.carriedAntigenValue = 0;
      entity.carriedDebrisCount = 0;
      entity.targetPosition = null;
    }

    if (entity.carriedDebrisCount < adaptive.dendriticCarryCapacity) {
      const nearestCollectableDebris = findNearestDebris(
        state,
        entity.position,
        balanceValues.debris.collectRange,
      );

      if (nearestCollectableDebris) {
        entity.carriedAntigenValue += nearestCollectableDebris.antigenValue;
        entity.carriedDebrisCount += 1;
        state.debris = state.debris.filter(
          (debris) => debris.id !== nearestCollectableDebris.id,
        );
      }
    }

    if (entity.carriedDebrisCount >= adaptive.dendriticCarryCapacity) {
      entity.targetPosition = { x: lymphNode.x, y: lymphNode.y };
      continue;
    }

    const nextDebris = findNearestDebris(state, entity.position);

    if (nextDebris) {
      entity.targetPosition = { ...nextDebris.position };
      continue;
    }

    if (entity.carriedDebrisCount > 0) {
      entity.targetPosition = { x: lymphNode.x, y: lymphNode.y };
    }
  }
}

function findNearestDebris(
  state: GameState,
  position: { x: number; y: number },
  maxDistance = Number.POSITIVE_INFINITY,
): PathogenDebris | null {
  let nearest: PathogenDebris | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const debris of state.debris) {
    const currentDistance = distance(position, debris.position);

    if (
      currentDistance <= maxDistance &&
      currentDistance < nearestDistance
    ) {
      nearest = debris;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}

function createDebris(
  state: GameState,
  bacterium: BacteriumEntity,
): PathogenDebris {
  const id = `debris-${state.nextDebrisNumber}`;
  const definition = pathogenDefinitions[bacterium.pathogenTypeId];

  state.nextDebrisNumber += 1;

  return {
    id,
    position: { ...bacterium.position },
    pathogenTypeId: bacterium.pathogenTypeId,
    antigenProfileId: definition.antigenProfileId,
    antigenValue: bacterium.antigenValue ?? definition.antigenValue,
    ttlMs: balanceValues.debris.ttlMs,
  };
}

function shouldDropDebris(
  state: GameState,
  bacterium: BacteriumEntity,
  entityId: string,
): boolean {
  const definition = pathogenDefinitions[bacterium.pathogenTypeId];
  const dropChance = bacterium.debrisDropChance ?? definition.debrisDropChance;

  if (dropChance >= 1) {
    return true;
  }

  const hash = stableHash(`${entityId}-${state.elapsedMs}`);

  return (hash % 1000) / 1000 <= dropChance;
}

function stableHash(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}
