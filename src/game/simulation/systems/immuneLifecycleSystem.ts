import { balanceValues } from "../../data/balance";
import { distance } from "../../types/shared";
import type { GameState } from "../core/GameState";
import {
  isHostilePathogen,
  isImmuneUnit,
  isNeutrophil,
  type NeutrophilEntity,
} from "../entities";
import { spawnNetTrap } from "./netTrapSystem";

export function applyImmuneLifecycleSystem(
  state: GameState,
  deltaMs: number,
): void {
  const seconds = deltaMs / 1000;

  for (const [id, entity] of Object.entries(state.entities)) {
    if (!isImmuneUnit(entity)) {
      continue;
    }

    if (isNeutrophil(entity)) {
      if (entity.deathState) {
        updateNeutrophilDeath(state, entity, id, deltaMs);
        continue;
      }

      entity.lifeRemainingMs = Math.max(
        0,
        (entity.lifeRemainingMs ?? balanceValues.neutrophilLifetimeMs) - deltaMs,
      );
      entity.health = Math.max(
        0,
        entity.health - balanceValues.combat.neutrophilSelfDamagePerSecond * seconds,
      );
    }

    if (
      isNeutrophil(entity) &&
      (entity.health <= 0 || (entity.lifeRemainingMs ?? 1) <= 0)
    ) {
      beginNeutrophilDeath(state, entity);
      continue;
    }

    if (entity.health <= 0) {
      delete state.entities[id];
    }
  }
}

function beginNeutrophilDeath(
  state: GameState,
  neutrophil: NeutrophilEntity,
): void {
  const hasNearbyPathogen = Object.values(state.entities)
    .filter(isHostilePathogen)
    .some(
      (pathogen) =>
        pathogen.health > 0 &&
        distance(pathogen.position, neutrophil.position) <=
          balanceValues.netosis.triggerRadius + pathogen.radius,
    );

  neutrophil.deathState = hasNearbyPathogen ? "netBurst" : "death";
  neutrophil.deathRemainingMs = hasNearbyPathogen
    ? balanceValues.netosis.burstDurationMs
    : balanceValues.netosis.normalDeathDurationMs;
  neutrophil.netTrapCreated = false;
  neutrophil.health = 0;
  neutrophil.lifeRemainingMs = 0;
  neutrophil.targetPosition = null;
  neutrophil.idleTargetPosition = null;
  neutrophil.explicitTargetEntityId = null;
  neutrophil.tacticalState = "holdingPosition";
  neutrophil.lastOrderFeedback = hasNearbyPathogen
    ? "NETose engagee"
    : "Mort cellulaire";
  state.selectedEntityIds = state.selectedEntityIds.filter(
    (entityId) => entityId !== neutrophil.id,
  );
}

function updateNeutrophilDeath(
  state: GameState,
  neutrophil: NeutrophilEntity,
  id: string,
  deltaMs: number,
): void {
  const previousRemainingMs = neutrophil.deathRemainingMs ?? 0;
  const durationMs =
    neutrophil.deathState === "netBurst"
      ? balanceValues.netosis.burstDurationMs
      : balanceValues.netosis.normalDeathDurationMs;
  const previousElapsedMs = durationMs - previousRemainingMs;
  const nextRemainingMs = Math.max(0, previousRemainingMs - deltaMs);
  const nextElapsedMs = durationMs - nextRemainingMs;

  if (
    neutrophil.deathState === "netBurst" &&
    !neutrophil.netTrapCreated &&
    previousElapsedMs < balanceValues.netosis.trapSpawnDelayMs &&
    nextElapsedMs >= balanceValues.netosis.trapSpawnDelayMs
  ) {
    spawnNetTrap(state, neutrophil.id, neutrophil.position);
    neutrophil.netTrapCreated = true;
  }

  neutrophil.deathRemainingMs = nextRemainingMs;

  if (nextRemainingMs <= 0) {
    delete state.entities[id];
  }
}
