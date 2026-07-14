import { balanceValues } from "../../data/balance";
import { createLymphRoutes, type LymphRoute } from "../../data/lymphRoutes";
import { missionDefinitions } from "../../data/missions";
import { getLymphExitForMissionMap } from "../../data/tacticalMaps";
import { pathogenDefinitions } from "../../data/pathogens";
import { distance, stableHash } from "../../types/shared";
import type { GameState, PathogenDebris } from "../core/GameState";
import {
  isAdvancedThreat,
  isBacterium,
  isDendriticCell,
  isVirus,
  type AdvancedThreatEntity,
  type BacteriumEntity,
  type DendriticCellEntity,
  type VirusEntity,
} from "../entities";
import { canCreateDebris } from "./entityLimitSystem";

export function applyDebrisSystem(state: GameState, deltaMs: number): void {
  decayDebris(state, deltaMs);
  convertDeadBacteriaToDebris(state);
  convertDeadVirusesToDebris(state);
  convertDeadAdvancedThreatsToDebris(state);
  processDendriticCells(state, deltaMs);
}

function decayDebris(state: GameState, deltaMs: number): void {
  state.debris = state.debris
    .map((debris) => ({
      ...debris,
      ttlMs: debris.ttlMs - deltaMs,
    }))
    .filter((debris) => debris.ttlMs > 0);
}

function convertDeadVirusesToDebris(state: GameState): void {
  for (const [id, entity] of Object.entries(state.entities)) {
    if (!isVirus(entity) || entity.health > 0) {
      continue;
    }

    if (canCreateDebris(state) && shouldDropVirusDebris(state, entity, id)) {
      state.debris.push(createVirusDebris(state, entity));
    }

    addThreatScoreBonus(state, entity.pathogenTypeId);
    delete state.entities[id];
  }
}

function convertDeadBacteriaToDebris(state: GameState): void {
  for (const [id, entity] of Object.entries(state.entities)) {
    if (!isBacterium(entity) || entity.health > 0) {
      continue;
    }

    if (canCreateDebris(state) && shouldDropDebris(state, entity, id)) {
      state.debris.push(createDebris(state, entity));
    }

    addThreatScoreBonus(state, entity.pathogenTypeId);
    delete state.entities[id];
  }
}

function convertDeadAdvancedThreatsToDebris(state: GameState): void {
  for (const [id, entity] of Object.entries(state.entities)) {
    if (!isAdvancedThreat(entity) || entity.health > 0) {
      continue;
    }

    if (canCreateDebris(state) && shouldDropAdvancedThreatDebris(state, entity, id)) {
      state.debris.push(createAdvancedThreatDebris(state, entity));
    }

    addThreatScoreBonus(state, entity.pathogenTypeId);
    delete state.entities[id];
  }
}

function createVirusDebris(
  state: GameState,
  virus: VirusEntity,
): PathogenDebris {
  const id = `debris-${state.nextDebrisNumber}`;
  const definition = pathogenDefinitions[virus.pathogenTypeId];

  state.nextDebrisNumber += 1;

  return {
    id,
    position: { ...virus.position },
    pathogenTypeId: virus.pathogenTypeId,
    antigenProfileId: definition.antigenProfileId,
    antigenValue: virus.antigenValue,
    ttlMs: balanceValues.debris.ttlMs,
  };
}

function createAdvancedThreatDebris(
  state: GameState,
  entity: AdvancedThreatEntity,
): PathogenDebris {
  const id = `debris-${state.nextDebrisNumber}`;
  const definition = pathogenDefinitions[entity.pathogenTypeId];

  state.nextDebrisNumber += 1;

  return {
    id,
    position: { ...entity.position },
    pathogenTypeId: entity.pathogenTypeId,
    antigenProfileId: definition.antigenProfileId,
    antigenValue: entity.antigenValue,
    ttlMs: balanceValues.debris.ttlMs,
  };
}

function processDendriticCells(state: GameState, deltaMs: number): void {
  const mission = missionDefinitions[state.missionId];
  const lymphNode =
    getLymphExitForMissionMap(state.tacticalMap) ??
    mission.map.lymphExit ??
    mission.map.lymphNode;
  const adaptive = balanceValues.adaptive;

  for (const entity of Object.values(state.entities)) {
    if (!isDendriticCell(entity)) {
      continue;
    }

    if (entity.lymphTransit?.phase === "away") {
      processDendriticReturn(state, entity, deltaMs);
      continue;
    }

    if (entity.lymphTransit?.phase === "following") {
      advanceDendriticAlongLymph(state, entity);
      continue;
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
        entity.tacticalState = "collectingAntigen";
        entity.lastOrderFeedback = "Debris collecte";
      }
    }

    if (entity.carriedDebrisCount >= adaptive.dendriticCarryCapacity) {
      beginDendriticLymphTransit(state, entity, lymphNode);
      continue;
    }

    const nextDebris = findNearestDebris(state, entity.position);

    if (nextDebris) {
      entity.targetPosition = { ...nextDebris.position };
      entity.orderAnchor = { ...nextDebris.position };
      entity.tacticalState = "collectingAntigen";
      continue;
    }

    if (entity.carriedDebrisCount > 0) {
      beginDendriticLymphTransit(state, entity, lymphNode);
    }
  }
}

function beginDendriticLymphTransit(
  state: GameState,
  entity: DendriticCellEntity,
  fallbackExit: { x: number; y: number },
): void {
  const route = findNearestLymphRoute(state, entity.position);

  if (!route) {
    entity.targetPosition = { ...fallbackExit };
    entity.orderAnchor = { ...fallbackExit };
    entity.tacticalState = "deliveringToLymph";
    entity.lastOrderFeedback = "Dendritique rejoint la sortie lymphatique";
    return;
  }

  const startIndex = findNearestPointIndex(route.path, entity.position);

  entity.lymphTransit = {
    exitId: route.exitId,
    routePointIndex: startIndex,
    routePathLength: route.path.length,
    phase: "following",
    returnRemainingMs: 0,
    visualAlpha: 1,
  };
  entity.targetPosition = { ...route.path[startIndex] };
  entity.orderAnchor = { ...route.path[startIndex] };
  entity.idleTargetPosition = null;
  entity.explicitTargetEntityId = null;
  entity.tacticalState = "deliveringToLymph";
  entity.lastOrderFeedback = "Dendritique suit la lymphe";
}

function advanceDendriticAlongLymph(
  state: GameState,
  entity: DendriticCellEntity,
): void {
  const transit = entity.lymphTransit;
  const route = transit
    ? createLymphRoutes(state.tacticalMap).find(
        (candidate) => candidate.exitId === transit.exitId,
      )
    : undefined;

  if (!transit || !route) {
    entity.lymphTransit = undefined;
    return;
  }

  const routePoints = [...route.path, ...route.offMapBridge.slice(1)];
  const expectedTarget = routePoints[transit.routePointIndex];

  if (entity.targetPosition) {
    if (
      expectedTarget &&
      distance(entity.targetPosition, expectedTarget) > 1
    ) {
      entity.targetPosition = { ...expectedTarget };
      entity.orderAnchor = { ...expectedTarget };
    }
    updateDendriticFade(transit, routePoints.length);
    return;
  }

  transit.routePointIndex += 1;

  if (transit.routePointIndex < routePoints.length) {
    entity.targetPosition = { ...routePoints[transit.routePointIndex] };
    entity.orderAnchor = { ...entity.targetPosition };
    entity.tacticalState = "deliveringToLymph";
    updateDendriticFade(transit, routePoints.length);
    return;
  }

  deliverDendriticAntigens(state, entity);
  transit.phase = "away";
  transit.returnRemainingMs = balanceValues.adaptive.dendriticLymphReturnMs;
  transit.visualAlpha = 0;
  entity.targetPosition = null;
  entity.idleTargetPosition = null;
  entity.tacticalState = "inLymphTransit";
  entity.lastOrderFeedback = "Signal livre hors carte";
  state.selectedEntityIds = state.selectedEntityIds.filter(
    (entityId) => entityId !== entity.id,
  );
}

function processDendriticReturn(
  state: GameState,
  entity: DendriticCellEntity,
  deltaMs: number,
): void {
  const transit = entity.lymphTransit;

  if (!transit) {
    return;
  }

  transit.returnRemainingMs = Math.max(0, transit.returnRemainingMs - deltaMs);

  if (transit.returnRemainingMs > 0) {
    return;
  }

  const exit = state.tacticalMap.lymphaticExits.find(
    (candidate) => candidate.id === transit.exitId,
  );

  if (exit) {
    entity.position = { ...exit.position };
    entity.orderAnchor = { ...exit.position };
  }

  entity.lymphTransit = undefined;
  entity.targetPosition = null;
  entity.idleTargetPosition = null;
  entity.tacticalState = "guardingArea";
  entity.lastOrderFeedback = "Dendritique revenue de la lymphe";
}

function deliverDendriticAntigens(
  state: GameState,
  entity: DendriticCellEntity,
): void {
  const deliveredAntigens = entity.carriedAntigenValue;
  const deliveredSignals = entity.carriedDebrisCount;

  state.resources.antigens = Math.min(
    balanceValues.maxAntigens,
    state.resources.antigens + deliveredAntigens,
  );
  state.missionStats.antigensCollected += deliveredAntigens;
  state.missionStats.lymphSignalsDelivered += deliveredSignals;
  entity.carriedAntigenValue = 0;
  entity.carriedDebrisCount = 0;
}

function updateDendriticFade(
  transit: NonNullable<DendriticCellEntity["lymphTransit"]>,
  routePointCount: number,
): void {
  const offMapSteps = Math.max(1, routePointCount - transit.routePathLength);
  const offMapProgress = Math.max(
    0,
    transit.routePointIndex - (transit.routePathLength - 1),
  );

  transit.visualAlpha = Math.max(0.08, 1 - offMapProgress / offMapSteps);
}

function findNearestLymphRoute(
  state: GameState,
  position: { x: number; y: number },
): LymphRoute | null {
  return createLymphRoutes(state.tacticalMap)
    .map((route) => ({
      route,
      distance: Math.min(
        ...route.path.map((point) => distance(position, point)),
      ),
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.route ?? null;
}

function findNearestPointIndex(
  points: Array<{ x: number; y: number }>,
  position: { x: number; y: number },
): number {
  return points.reduce(
    (nearestIndex, point, index) =>
      distance(position, point) < distance(position, points[nearestIndex])
        ? index
        : nearestIndex,
    0,
  );
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

function shouldDropVirusDebris(
  state: GameState,
  virus: VirusEntity,
  entityId: string,
): boolean {
  if (virus.debrisDropChance >= 1) {
    return true;
  }

  const hash = stableHash(`${entityId}-${state.elapsedMs}`);

  return (hash % 1000) / 1000 <= virus.debrisDropChance;
}

function shouldDropAdvancedThreatDebris(
  state: GameState,
  entity: AdvancedThreatEntity,
  entityId: string,
): boolean {
  if (entity.debrisDropChance >= 1) {
    return true;
  }

  const hash = stableHash(`${entityId}-${state.elapsedMs}`);

  return (hash % 1000) / 1000 <= entity.debrisDropChance;
}

function addThreatScoreBonus(
  state: GameState,
  pathogenTypeId: keyof typeof pathogenDefinitions,
): void {
  state.missionStats.pathogenKills[pathogenTypeId] =
    (state.missionStats.pathogenKills[pathogenTypeId] ?? 0) + 1;
  state.missionStats.threatScoreBonus +=
    pathogenDefinitions[pathogenTypeId].scoreValue ?? 0;
}
