import { balanceValues } from "../../data/balance";
import { distance } from "../../types/shared";
import type { GameState, TissueRepairState } from "../core/GameState";
import { isHostilePathogen } from "../entities";
import { getRuntimeMapBalance } from "./runtimeMapBalance";

export function applyTissueRegenerationSystem(
  state: GameState,
  deltaMs: number,
): void {
  const balance = getRuntimeMapBalance(state);
  const seconds = deltaMs / 1000;
  const hostileEntities = Object.values(state.entities).filter(isHostilePathogen);
  const infectedCells = state.tissueCells.filter(
    (cell) => cell.status === "infected",
  );
  const stabilizedRatio = getStabilizedCombatSiteRatio(state);
  const blockedReason = getRepairBlockedReason(
    state,
    hostileEntities.length,
    infectedCells.length,
    stabilizedRatio,
  );

  if (blockedReason) {
    state.tissueRepair = createRepairState("blocked", blockedReason, 0, 0);
    return;
  }

  const nextStableMs = state.tissueRepair.stableMs + deltaMs;

  if (nextStableMs < balance.tissueRegenDelayMs) {
    state.tissueRepair = createRepairState("waiting", null, nextStableMs, 0);
    return;
  }

  const inflammationPenalty = Math.max(
    0.18,
    1 - state.inflammation.value * balance.inflammationRegenPenalty,
  );
  const siteBonus = 0.72 + stabilizedRatio * 0.42;
  const regenPerSecond =
    balance.tissueRegenRate * inflammationPenalty * siteBonus;
  const previousHealth = state.tissue.health;

  state.tissue.health = Math.min(
    state.tissue.maxHealth,
    state.tissue.health + regenPerSecond * seconds,
  );
  repairDamagedCells(state, regenPerSecond * 0.55 * seconds);

  state.tissueRepair = createRepairState(
    "recovering",
    null,
    nextStableMs,
    state.tissue.health > previousHealth ? regenPerSecond : 0,
  );
}

function getRepairBlockedReason(
  state: GameState,
  hostileCount: number,
  infectedCellCount: number,
  stabilizedRatio: number,
): TissueRepairState["blockedReason"] {
  if (state.inflammation.value >= balanceValues.inflammation.dangerThreshold) {
    return "inflammation";
  }

  if (infectedCellCount >= Math.max(3, Math.ceil(state.tissueCells.length * 0.16))) {
    return "infection";
  }

  const allowedHostilePressure = Math.max(
    2,
    Math.ceil(state.tacticalMap.combatSites.length * 1.3),
  );

  if (hostileCount > allowedHostilePressure || stabilizedRatio < 0.35) {
    return "combat";
  }

  return null;
}

function getStabilizedCombatSiteRatio(state: GameState): number {
  if (state.tacticalMap.combatSites.length === 0) {
    return 1;
  }

  const hostileEntities = Object.values(state.entities).filter(isHostilePathogen);
  const stabilizedSites = state.tacticalMap.combatSites.filter((site) => {
    const hostileNearby = hostileEntities.some(
      (entity) => distance(entity.position, site.position) <= site.radius * 1.35,
    );

    return !hostileNearby;
  });

  return stabilizedSites.length / state.tacticalMap.combatSites.length;
}

function repairDamagedCells(state: GameState, healing: number): void {
  if (healing <= 0) {
    return;
  }

  for (const cell of state.tissueCells) {
    if (cell.status !== "healthy" || cell.health >= cell.maxHealth) {
      continue;
    }

    cell.health = Math.min(cell.maxHealth, cell.health + healing);
  }
}

function createRepairState(
  status: TissueRepairState["status"],
  blockedReason: TissueRepairState["blockedReason"],
  stableMs: number,
  ratePerSecond: number,
): TissueRepairState {
  return {
    status,
    blockedReason,
    stableMs,
    ratePerSecond,
  };
}
