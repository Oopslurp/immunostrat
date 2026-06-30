import { balanceValues } from "../../data/balance";
import {
  createInfiniteWave,
  getActiveInfiniteMutators,
  getInfiniteCycle,
  infiniteDifficultySettings,
} from "../../data/infiniteMode";
import { missionDefinitions } from "../../data/missions";
import { pathogenDefinitions } from "../../data/pathogens";
import type { GameState } from "../core/GameState";
import { isHostilePathogen, type BacteriumEntity, type VirusEntity } from "../entities";
import { spawnBacterium } from "../pathogens/createBacterium";
import { spawnVirus } from "../pathogens/createVirus";

export function applyWaveSystem(state: GameState): void {
  const mission = missionDefinitions[state.missionId];
  const wave =
    mission.mode === "infinite"
      ? createInfiniteWave(
          state.waves.currentWaveIndex + 1,
          state.preparation.infiniteDifficulty ?? "normal",
        )
      : mission.waves[state.waves.currentWaveIndex];

  if (!wave) {
    return;
  }

  const nextSpawnAt =
    wave.startsAtMs + state.waves.spawnedInCurrentWave * wave.spawnIntervalMs;

  if (
    state.elapsedMs < nextSpawnAt ||
    state.waves.spawnedInCurrentWave >= wave.count
  ) {
    if (state.waves.spawnedInCurrentWave >= wave.count) {
      state.waves.currentWaveIndex += 1;
      state.waves.spawnedInCurrentWave = 0;
    }

    return;
  }

  if (mission.mode === "infinite" && isInfinitePathogenLimitReached(state)) {
    return;
  }

  const spawnNumber = state.waves.spawnedInCurrentWave;
  const entryZone = mission.map.bacteriaEntryZone;
  const yRange = entryZone.yMax - entryZone.yMin;
  const y =
    entryZone.yMin +
    ((spawnNumber * balanceValues.bacteriaSpawnYStep +
      state.waves.currentWaveIndex * balanceValues.bacteriaSpawnWaveOffset) %
      yRange);
  state.waves.spawnedInCurrentWave += 1;
  if (pathogenDefinitions[wave.pathogenTypeId].pathogenClass === "virus") {
    applyInfiniteSpawnModifiers(
      state,
      spawnVirus(state, wave.pathogenTypeId, { x: entryZone.x, y }),
    );
    return;
  }

  applyInfiniteSpawnModifiers(
    state,
    spawnBacterium(state, wave.pathogenTypeId, { x: entryZone.x, y }),
  );
}

function isInfinitePathogenLimitReached(state: GameState): boolean {
  const difficulty = state.preparation.infiniteDifficulty ?? "normal";
  const maxActivePathogens =
    infiniteDifficultySettings[difficulty].maxActivePathogens;
  const activePathogens = Object.values(state.entities).filter(isHostilePathogen);

  return activePathogens.length >= maxActivePathogens;
}

function applyInfiniteSpawnModifiers(
  state: GameState,
  entity: BacteriumEntity | VirusEntity,
): void {
  const mission = missionDefinitions[state.missionId];

  if (mission.mode !== "infinite") {
    return;
  }

  const difficulty = state.preparation.infiniteDifficulty ?? "normal";
  const wave = state.waves.currentWaveIndex + 1;
  const cycle = getInfiniteCycle(wave);
  const phaseScale = 1 + Math.max(0, cycle - 1) * 0.055;
  const mutators = getActiveInfiniteMutators(cycle, difficulty);

  entity.maxHealth *= phaseScale;
  entity.health = entity.maxHealth;
  entity.movementSpeed *= 1 + Math.min(0.55, cycle * 0.012);

  for (const mutator of mutators) {
    if (entity.kind === "bacterium" && mutator.id === "bacterialSpeedUp") {
      entity.movementSpeed *= 1 + mutator.intensity;
    }

    if (entity.kind === "bacterium" && mutator.id === "bacterialResistanceUp") {
      entity.maxHealth *= 1 + mutator.intensity;
      entity.health = entity.maxHealth;
      entity.armor = (entity.armor ?? 0) + Math.ceil(mutator.intensity * 10);
    }

    if (entity.kind === "virus" && mutator.id === "viralReplicationUp") {
      entity.movementSpeed *= 1 + mutator.intensity;
      entity.lifeRemainingMs *= 1 + mutator.intensity;
    }

    if (entity.kind === "bacterium" && mutator.id === "tissueFragilityUp") {
      entity.tissueDamage *= 1 + mutator.intensity;
    }
  }
}
