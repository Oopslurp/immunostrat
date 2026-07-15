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

export type CorruptionBranchPoint = {
  x: number;
  y: number;
};

export type CorruptionBranch = {
  points: CorruptionBranchPoint[];
  width: number;
  color: number;
  alpha: number;
  radialProgress: number;
  generation: "primary" | "secondary";
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
  spotCount = 118,
): CorruptionSpot[] {
  const corruptionColor = 0x713b8f;

  return Array.from({ length: spotCount }, (_, index) => {
    const angle = deterministicValue(site.id, index, 11) * Math.PI * 2;
    const outerSpore = deterministicValue(site.id, index, 13) > 0.76;
    const radialProgress = outerSpore
      ? 0.48 + deterministicValue(site.id, index, 17) * 0.4
      : Math.sqrt(deterministicValue(site.id, index, 17)) * 0.58;
    const distance = radialProgress * site.radius;
    const irregularity = 0.76 + deterministicValue(site.id, index, 23) * 0.34;

    const point = clampCorruptionPoint(
      Math.cos(angle) * distance * irregularity,
      Math.sin(angle) * distance / irregularity,
      site.radius * 0.9,
    );

    return {
      x: point.x,
      y: point.y,
      size: outerSpore
        ? 4 + Math.floor(deterministicValue(site.id, index, 29) * 5)
        : 5 + Math.floor(deterministicValue(site.id, index, 29) * 8),
      color: corruptionColor,
      alpha: 0.045 + (1 - radialProgress) * 0.065,
      radialProgress,
      pulseOffset: deterministicValue(site.id, index, 37) * Math.PI * 2,
    };
  });
}

export function createCorruptionBranches(
  site: CombatSiteDefinition,
  primaryCount = 12,
): CorruptionBranch[] {
  const branches: CorruptionBranch[] = [];
  const corruptionColor = 0x713b8f;
  const siteRotation = deterministicValue(site.id, 0, 89) * Math.PI * 2;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < primaryCount; index += 1) {
    const baseAngle =
      siteRotation +
      index * goldenAngle +
      (deterministicValue(site.id, index, 97) - 0.5) * 0.62;
    const endRadius =
      site.radius * (0.78 + deterministicValue(site.id, index, 101) * 0.16);
    const primaryPoints = Array.from({ length: 6 }, (_, pointIndex) => {
      const progress = pointIndex / 5;
      const radius = site.radius * 0.06 + (endRadius - site.radius * 0.06) * progress;
      const bend =
        (deterministicValue(site.id, index * 10 + pointIndex, 103) - 0.5) *
        (0.18 + progress * 0.2);

      return snapCorruptionPoint(
        Math.cos(baseAngle + bend) * radius,
        Math.sin(baseAngle + bend) * radius,
      );
    });

    branches.push({
      points: primaryPoints,
      width: 5 + Math.floor(deterministicValue(site.id, index, 109) * 3),
      color: corruptionColor,
      alpha: 0.09 + deterministicValue(site.id, index, 127) * 0.045,
      radialProgress: endRadius / site.radius,
      generation: "primary",
    });

    for (let childIndex = 0; childIndex < 2; childIndex += 1) {
      const forkIndex = 2 + childIndex;
      const start = primaryPoints[forkIndex] ?? primaryPoints[2];
      const side = childIndex === 0 ? -1 : 1;
      const childAngle =
        baseAngle +
        side * (0.52 + deterministicValue(site.id, index * 2 + childIndex, 131) * 0.42);
      const childLength =
        site.radius * (0.2 + deterministicValue(site.id, index * 2 + childIndex, 137) * 0.12);
      const childPoints = [start];

      for (let pointIndex = 1; pointIndex <= 3; pointIndex += 1) {
        const progress = pointIndex / 3;
        const drift =
          (deterministicValue(site.id, index * 20 + childIndex * 4 + pointIndex, 139) - 0.5) *
          0.28;
        const rawX = start.x + Math.cos(childAngle + drift) * childLength * progress;
        const rawY = start.y + Math.sin(childAngle + drift) * childLength * progress;
        childPoints.push(clampCorruptionPoint(rawX, rawY, site.radius * 0.94));
      }

      branches.push({
        points: childPoints,
        width: 3 + Math.floor(deterministicValue(site.id, index * 2 + childIndex, 149) * 2),
        color: corruptionColor,
        alpha:
          0.065 +
          deterministicValue(site.id, index * 2 + childIndex, 151) * 0.04,
        radialProgress:
          Math.hypot(childPoints.at(-1)?.x ?? 0, childPoints.at(-1)?.y ?? 0) /
          site.radius,
        generation: "secondary",
      });
    }
  }

  return branches;
}

export function advanceCorruptionProgress(
  currentProgress: number,
  targetActive: boolean,
  deltaMs: number,
  transitionMs = 1_000,
): number {
  const target = targetActive ? 1 : 0;
  const difference = target - currentProgress;
  const step = Math.max(0, deltaMs) / Math.max(1, transitionMs);

  return Math.min(
    1,
    Math.max(
      0,
      currentProgress +
        Math.sign(difference) * Math.min(step, Math.abs(difference)),
    ),
  );
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

function snapCorruptionPoint(x: number, y: number): CorruptionBranchPoint {
  return {
    x: Math.round(x / 4) * 4,
    y: Math.round(y / 4) * 4,
  };
}

function clampCorruptionPoint(
  x: number,
  y: number,
  maxRadius: number,
): CorruptionBranchPoint {
  const distance = Math.hypot(x, y);
  const scale = distance > maxRadius ? maxRadius / distance : 1;

  return snapCorruptionPoint(x * scale, y * scale);
}
