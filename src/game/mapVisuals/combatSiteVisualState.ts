import { createInfiniteWave } from "../data/infiniteMode";
import { missionDefinitions } from "../data/missions";
import type { CombatSiteDefinition } from "../data/tacticalMaps";
import type { GameState } from "../simulation/core/GameState";
import { isHostilePathogen } from "../simulation/entities";
import { getRuntimeMapBalance } from "../simulation/systems/runtimeMapBalance";
import { distanceSquared, stableHash } from "../types/shared";

export type CombatSiteVisualPhase =
  | "dormant"
  | "activation"
  | "active"
  | "destabilizing"
  | "destroyed"
  | "lost";

export type CorruptionSpot = {
  x: number;
  y: number;
  size: number;
  color: number;
  alpha: number;
  radialProgress: number;
  pulseOffset: number;
};

export type LostTissuePixel = {
  x: number;
  y: number;
  size: number;
  alpha: number;
};

export function getHostileCountsByCombatSite(state: GameState): Map<string, number> {
  const counts = new Map(
    state.tacticalMap.combatSites.map((site) => [site.id, 0]),
  );

  for (const entity of Object.values(state.entities)) {
    if (!isHostilePathogen(entity)) {
      continue;
    }

    let nearestSite: CombatSiteDefinition | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const site of state.tacticalMap.combatSites) {
      const candidateDistance = distanceSquared(entity.position, site.position);

      if (candidateDistance < nearestDistance) {
        nearestDistance = candidateDistance;
        nearestSite = site;
      }
    }

    if (nearestSite) {
      counts.set(nearestSite.id, (counts.get(nearestSite.id) ?? 0) + 1);
    }
  }

  return counts;
}

export function getUpcomingCombatSiteActivation(
  state: GameState,
  thresholdMs = 10_000,
): { siteId: string; remainingMs: number } | null {
  if (state.status !== "running" || state.waves.spawnedInCurrentWave > 0) {
    return null;
  }

  const mission = missionDefinitions[state.missionId];
  const wave =
    mission.mode === "infinite"
      ? createInfiniteWave(
          state.waves.currentWaveIndex + 1,
          state.preparation.infiniteDifficulty ?? "normal",
        )
      : mission.waves[state.waves.currentWaveIndex];

  if (!wave || state.tacticalMap.combatSites.length === 0) {
    return null;
  }

  const mapBalance = getRuntimeMapBalance(state);
  const firstSpawnStartMultiplier =
    state.waves.currentWaveIndex === 0 ? 1 : mapBalance.waveIntervalMultiplier;
  const remainingMs =
    wave.startsAtMs * firstSpawnStartMultiplier - state.elapsedMs;

  if (remainingMs <= 0 || remainingMs > thresholdMs) {
    return null;
  }

  const activeSiteCount = Math.max(
    1,
    Math.min(
      state.tacticalMap.combatSites.length,
      mapBalance.maxActiveCombatSites,
    ),
  );
  const site =
    state.tacticalMap.combatSites[
      state.waves.currentWaveIndex % activeSiteCount
    ] ?? state.tacticalMap.combatSites[0];

  return site ? { siteId: site.id, remainingMs } : null;
}

export function isCombatSiteLocallyLost(
  state: GameState,
  site: CombatSiteDefinition,
): boolean {
  const localCells = state.tissueCells.filter((cell) => {
    const nearestSite = state.tacticalMap.combatSites.reduce<
      CombatSiteDefinition | undefined
    >((nearest, candidate) => {
      if (!nearest) {
        return candidate;
      }

      return distanceSquared(cell.position, candidate.position) <
        distanceSquared(cell.position, nearest.position)
        ? candidate
        : nearest;
    }, undefined);

    return nearestSite?.id === site.id;
  });

  if (localCells.length < 2) {
    return false;
  }

  const destroyedCells = localCells.filter(
    (cell) => cell.status === "destroyed",
  ).length;

  return destroyedCells / localCells.length >= 0.8;
}

export function createCorruptionPattern(
  site: CombatSiteDefinition,
  spotCount = 46,
): CorruptionSpot[] {
  const palette = [0x8f263b, 0xc33c3f, 0xe85a3a, 0xff8738, 0x7d2946];

  return Array.from({ length: spotCount }, (_, index) => {
    const angle = deterministicValue(site.id, index, 11) * Math.PI * 2;
    const radialProgress = Math.sqrt(deterministicValue(site.id, index, 17));
    const distance = radialProgress * site.radius * 1.06;
    const irregularity = 0.82 + deterministicValue(site.id, index, 23) * 0.28;

    return {
      x: Math.round(Math.cos(angle) * distance * irregularity / 2) * 2,
      y: Math.round(Math.sin(angle) * distance / irregularity / 2) * 2,
      size: 2 + Math.floor(deterministicValue(site.id, index, 29) * 5),
      color: palette[
        Math.floor(deterministicValue(site.id, index, 31) * palette.length)
      ] ?? palette[0],
      alpha: 0.08 + (1 - radialProgress) * 0.12,
      radialProgress,
      pulseOffset: deterministicValue(site.id, index, 37) * Math.PI * 2,
    };
  });
}

export function createLostTissuePattern(
  site: CombatSiteDefinition,
  pixelCount = 34,
): LostTissuePixel[] {
  return Array.from({ length: pixelCount }, (_, index) => {
    const angle = deterministicValue(site.id, index, 53) * Math.PI * 2;
    const distance = Math.sqrt(deterministicValue(site.id, index, 59)) * site.radius * 0.92;

    return {
      x: Math.round(Math.cos(angle) * distance / 3) * 3,
      y: Math.round(Math.sin(angle) * distance / 3) * 3,
      size: 2 + Math.floor(deterministicValue(site.id, index, 61) * 4),
      alpha: 0.06 + deterministicValue(site.id, index, 67) * 0.1,
    };
  });
}

function deterministicValue(siteId: string, index: number, salt: number): number {
  return stableHash(`${siteId}:${index}:${salt}`) / 0xffffffff;
}
