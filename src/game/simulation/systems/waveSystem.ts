import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import { pathogenDefinitions } from "../../data/pathogens";
import type { GameState } from "../core/GameState";

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

  const definition = pathogenDefinitions[wave.pathogenTypeId];
  const spawnNumber = state.waves.spawnedInCurrentWave;
  const entryZone = mission.map.bacteriaEntryZone;
  const yRange = entryZone.yMax - entryZone.yMin;
  const y =
    entryZone.yMin +
    ((spawnNumber * balanceValues.bacteriaSpawnYStep +
      state.waves.currentWaveIndex * balanceValues.bacteriaSpawnWaveOffset) %
      yRange);
  const id = `bacterium-${state.nextEntityNumber}`;

  state.nextEntityNumber += 1;
  state.waves.spawnedInCurrentWave += 1;
  state.entities[id] = {
    id,
    kind: "bacterium",
    pathogenTypeId: wave.pathogenTypeId,
    position: { x: entryZone.x, y },
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    radius: definition.radius,
    movementSpeed: definition.movementSpeed,
    tissueDamage: definition.tissueDamage,
    tissueAttackRange: definition.tissueAttackRange,
    attackCooldownMs: definition.attackCooldownMs,
    attackCooldownRemainingMs: 0,
  };
}
