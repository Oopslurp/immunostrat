import { balanceValues } from "../../data/balance";
import { distance, moveToward } from "../../types/shared";
import type {
  GameState,
  NetTrapState,
} from "../core/GameState";
import {
  isHostilePathogen,
  type BacteriumEntity,
  type VirusEntity,
  type AdvancedThreatEntity,
} from "../entities";
import { applyPathogenDamage, applyTissueCellDamage } from "./damageSystem";

type NetAffectedPathogen =
  | BacteriumEntity
  | VirusEntity
  | AdvancedThreatEntity;

export function spawnNetTrap(
  state: GameState,
  sourceEntityId: string,
  position: { x: number; y: number },
): NetTrapState {
  const trap: NetTrapState = {
    id: `net-trap-${state.nextNetTrapNumber}`,
    sourceEntityId,
    position: { ...position },
    remainingMs: balanceValues.netosis.durationMs,
    tickAccumulatorMs: 0,
    capturedEntityIds: [],
  };

  state.nextNetTrapNumber += 1;
  state.netTraps.push(trap);
  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    kind: "netTrap",
    position: { ...position },
    radius: balanceValues.netosis.captureRadius,
    ttlMs: balanceValues.attackEffectTtlMs * 2,
  });
  state.nextEffectNumber += 1;

  return trap;
}

export function applyNetTrapSystem(state: GameState, deltaMs: number): void {
  const activeTraps = state.netTraps.filter((trap) => trap.remainingMs > 0);
  const pathogens = Object.values(state.entities)
    .filter(isHostilePathogen)
    .filter((pathogen) => pathogen.health > 0);

  resetNetEffects(pathogens);

  if (activeTraps.length === 0) {
    state.netTraps = [];
    return;
  }

  for (const trap of activeTraps) {
    trap.capturedEntityIds = [];
  }

  const pathogenOwners = new Map<string, NetTrapState>();

  for (const pathogen of pathogens) {
    const owner = findNearestTrap(
      activeTraps,
      pathogen.position,
      balanceValues.netosis.triggerRadius + pathogen.radius,
    );

    if (!owner) {
      continue;
    }

    pathogenOwners.set(pathogen.id, owner);
    applyAttraction(pathogen, owner, deltaMs);

    const isCaptured =
      distance(pathogen.position, owner.position) <=
      balanceValues.netosis.captureRadius + pathogen.radius;
    pathogen.netTrapId = owner.id;
    pathogen.netMovementMultiplier = isCaptured
      ? 0
      : balanceValues.netosis.pathogenSlowMultiplier;

    if (isCaptured) {
      owner.capturedEntityIds.push(pathogen.id);
    }
  }

  const tissueOwners = new Map<string, NetTrapState>();

  for (const cell of state.tissueCells) {
    if (cell.status === "destroyed") {
      continue;
    }

    const owner = findNearestTrap(
      activeTraps,
      cell.position,
      balanceValues.netosis.triggerRadius + cell.radius,
    );

    if (owner) {
      tissueOwners.set(cell.id, owner);
    }
  }

  for (const trap of activeTraps) {
    const activeDeltaMs = Math.min(deltaMs, trap.remainingMs);
    trap.tickAccumulatorMs += activeDeltaMs;

    while (trap.tickAccumulatorMs >= balanceValues.netosis.tickIntervalMs) {
      applyTrapDamageTick(state, trap, pathogenOwners, tissueOwners);
      trap.tickAccumulatorMs -= balanceValues.netosis.tickIntervalMs;
    }

    trap.remainingMs = Math.max(0, trap.remainingMs - deltaMs);
  }

  state.netTraps = state.netTraps.filter((trap) => trap.remainingMs > 0);

  if (state.netTraps.length === 0) {
    resetNetEffects(pathogens);
  }
}

function resetNetEffects(pathogens: NetAffectedPathogen[]): void {
  for (const pathogen of pathogens) {
    pathogen.netTrapId = undefined;
    pathogen.netMovementMultiplier = undefined;
  }
}

function applyAttraction(
  pathogen: NetAffectedPathogen,
  trap: NetTrapState,
  deltaMs: number,
): void {
  pathogen.position = moveToward(
    pathogen.position,
    trap.position,
    balanceValues.netosis.attractionStrength * (deltaMs / 1000),
  );
}

function applyTrapDamageTick(
  state: GameState,
  trap: NetTrapState,
  pathogenOwners: ReadonlyMap<string, NetTrapState>,
  tissueOwners: ReadonlyMap<string, NetTrapState>,
): void {
  const tickSeconds = balanceValues.netosis.tickIntervalMs / 1000;

  for (const pathogen of Object.values(state.entities).filter(isHostilePathogen)) {
    if (pathogen.health <= 0 || pathogenOwners.get(pathogen.id)?.id !== trap.id) {
      continue;
    }

    applyPathogenDamage(
      pathogen,
      balanceValues.netosis.pathogenDamagePerSecond * tickSeconds,
    );
  }

  for (const cell of state.tissueCells) {
    if (
      cell.status === "destroyed" ||
      tissueOwners.get(cell.id)?.id !== trap.id
    ) {
      continue;
    }

    applyTissueCellDamage(
      state,
      cell,
      balanceValues.netosis.civilianDamagePerSecond * tickSeconds,
    );
  }

  state.effects.push({
    id: `effect-${state.nextEffectNumber}`,
    kind: "netTrap",
    position: { ...trap.position },
    radius: balanceValues.netosis.triggerRadius,
    ttlMs: balanceValues.attackEffectTtlMs,
  });
  state.nextEffectNumber += 1;
}

function findNearestTrap(
  traps: NetTrapState[],
  position: { x: number; y: number },
  maxDistance: number,
): NetTrapState | null {
  let nearest: NetTrapState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const trap of traps) {
    const currentDistance = distance(position, trap.position);

    if (currentDistance <= maxDistance && currentDistance < nearestDistance) {
      nearest = trap;
      nearestDistance = currentDistance;
    }
  }

  return nearest;
}
