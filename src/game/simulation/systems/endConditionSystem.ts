import { missionDefinitions } from "../../data/missions";
import type { GameState } from "../core/GameState";
import { isBacterium } from "../entities";

export function applyEndConditionSystem(state: GameState): void {
  if (state.tissue.health <= 0) {
    state.status = "defeat";
    return;
  }

  const mission = missionDefinitions[state.missionId];
  const allWavesSpawned = state.waves.currentWaveIndex >= mission.waves.length;
  const bacteriaRemaining = Object.values(state.entities).some(isBacterium);

  if (allWavesSpawned && !bacteriaRemaining) {
    state.status = "victory";
  }
}
