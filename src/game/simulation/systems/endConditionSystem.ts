import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import type { GameState } from "../core/GameState";
import { isHostilePathogen } from "../entities";

export function applyEndConditionSystem(state: GameState): void {
  if (state.tissue.health <= 0) {
    state.status = "defeat";
    return;
  }

  const compromisedCells = state.tissueCells.filter(
    (cell) => cell.status === "infected" || cell.status === "destroyed",
  ).length;
  const compromisedRatio =
    state.tissueCells.length > 0 ? compromisedCells / state.tissueCells.length : 0;

  if (compromisedRatio >= balanceValues.missionFailure.maxCompromisedTissueCellRatio) {
    state.status = "defeat";
    return;
  }

  const mission = missionDefinitions[state.missionId];
  const allWavesSpawned = state.waves.currentWaveIndex >= mission.waves.length;
  const pathogensRemaining = Object.values(state.entities).some(isHostilePathogen);
  const infectedCellsRemaining = state.tissueCells.some(
    (cell) => cell.status === "infected",
  );

  if (allWavesSpawned && !pathogensRemaining && !infectedCellsRemaining) {
    state.status = "victory";
  }
}
