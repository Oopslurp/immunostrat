import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { pathogenDefinitions } from "../../data/pathogens";
import type { GameState } from "../core/GameState";
import { spawnBacterium } from "../pathogens/createBacterium";
import { spawnVirus } from "../pathogens/createVirus";

export function applyWaveSystem(state: GameState): void {
  const mission = missionDefinitions[state.missionId];
  const wave = mission.waves[state.waves.currentWaveIndex];

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
    spawnVirus(state, wave.pathogenTypeId, { x: entryZone.x, y });
    return;
  }

  spawnBacterium(state, wave.pathogenTypeId, { x: entryZone.x, y });
}
