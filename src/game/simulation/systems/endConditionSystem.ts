import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import type { GameState } from "../core/GameState";
import {
  areRequiredObjectivesComplete,
  isAllWavesCleared,
} from "../../campaign/objectives";

export function applyEndConditionSystem(state: GameState): void {
  const mission = missionDefinitions[state.missionId];

  if (
    mission.defeatConditions.some(
      (condition) => condition.kind === "tissueHealthZero",
    ) &&
    state.tissue.health <= 0
  ) {
    state.status = "defeat";
    return;
  }

  const compromisedCells = state.tissueCells.filter(
    (cell) => cell.status === "infected" || cell.status === "destroyed",
  ).length;
  const compromisedRatio =
    state.tissueCells.length > 0 ? compromisedCells / state.tissueCells.length : 0;

  const compromisedLimit =
    mission.defeatConditions.find(
      (condition) => condition.kind === "compromisedCellsRatioAtLeast",
    )?.value ?? balanceValues.missionFailure.maxCompromisedTissueCellRatio;

  if (compromisedRatio >= compromisedLimit) {
    state.status = "defeat";
    return;
  }

  const victory = mission.victoryConditions.every((condition) => {
    if (condition.kind === "allWavesCleared") {
      return isAllWavesCleared(state);
    }

    if (condition.kind === "requiredObjectivesComplete") {
      return areRequiredObjectivesComplete(state);
    }

    return false;
  });

  if (victory) {
    state.status = "victory";
  }
}
