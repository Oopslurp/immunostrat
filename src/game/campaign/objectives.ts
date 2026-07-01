import { missionDefinitions, type MissionId, type MissionObjective } from "../data/missions";
import { isHostilePathogen } from "../simulation/entities";
import type { GameState } from "../simulation/core/GameState";

export type ObjectiveStatus = {
  id: string;
  label: string;
  complete: boolean;
  required: boolean;
  progressLabel: string;
};

export function evaluateMissionObjectives(state: GameState): ObjectiveStatus[] {
  const mission = missionDefinitions[state.missionId];

  return mission.objectives.map((objective) => ({
    id: objective.id,
    label: objective.label,
    complete: isObjectiveComplete(state, objective),
    required: objective.required ?? false,
    progressLabel: getObjectiveProgressLabel(state, objective),
  }));
}

export function areRequiredObjectivesComplete(state: GameState): boolean {
  return evaluateMissionObjectives(state)
    .filter((objective) => objective.required)
    .every((objective) => objective.complete);
}

export function calculateMissionScore(state: GameState): number {
  const mission = missionDefinitions[state.missionId];
  const healthyCells = state.tissueCells.filter(
    (cell) => cell.status === "healthy",
  ).length;
  const completedObjectives = evaluateMissionObjectives(state).filter(
    (objective) => objective.complete,
  ).length;
  const tissueScore = Math.round(state.tissue.health * 3);
  const cellScore = healthyCells * 25;
  const objectiveScore = completedObjectives * 60;
  const threatBonus = state.missionStats.threatScoreBonus;
  const victoryBonus = state.status === "victory" ? mission.scoreReward ?? 100 : 0;
  const inflammationPenalty = Math.round(state.missionStats.peakInflammation * 1.4);
  const timePenalty = Math.floor(state.elapsedMs / 1000);

  return Math.max(
    0,
    tissueScore +
      cellScore +
      objectiveScore +
      threatBonus +
      victoryBonus -
      inflammationPenalty -
      timePenalty,
  );
}

export function getMissionRank(score: number): "C" | "B" | "A" | "S" {
  if (score >= 760) {
    return "S";
  }

  if (score >= 580) {
    return "A";
  }

  if (score >= 390) {
    return "B";
  }

  return "C";
}

export function isAllWavesCleared(state: GameState): boolean {
  const mission = missionDefinitions[state.missionId];
  const allWavesSpawned = state.waves.currentWaveIndex >= mission.waves.length;
  const pathogensRemaining = Object.values(state.entities).some(isHostilePathogen);

  return allWavesSpawned && !pathogensRemaining;
}

export function getFirstMissionId(): MissionId {
  return "woundBacteriaV1";
}

function isObjectiveComplete(
  state: GameState,
  objective: MissionObjective,
): boolean {
  if (objective.kind === "clearThreats") {
    return isAllWavesCleared(state);
  }

  if (objective.kind === "tissueHealthAtLeast") {
    return state.tissue.health >= objective.value;
  }

  if (objective.kind === "antigensAtLeast") {
    return state.resources.antigens >= objective.value;
  }

  if (objective.kind === "researchComplete") {
    return objective.researchId === "bacterialAnalysis"
      ? state.adaptiveResearch.bacterialAnalysisComplete
      : state.adaptiveResearch.viralAnalysisComplete;
  }

  if (objective.kind === "infectedCellsAtMost") {
    return getInfectedCellCount(state) <= objective.value;
  }

  if (objective.kind === "inflammationBelow") {
    return state.missionStats.peakInflammation < objective.value;
  }

  if (objective.kind === "unitProduced") {
    return (state.missionStats.producedUnits[objective.unitTypeId] ?? 0) > 0;
  }

  if (objective.kind === "abilityUsed") {
    return (state.missionStats.usedAbilities[objective.abilityId] ?? 0) > 0;
  }

  return false;
}

function getObjectiveProgressLabel(
  state: GameState,
  objective: MissionObjective,
): string {
  if (objective.kind === "clearThreats") {
    return isAllWavesCleared(state) ? "termine" : "en cours";
  }

  if (objective.kind === "tissueHealthAtLeast") {
    return `${Math.ceil(state.tissue.health)}/${objective.value}`;
  }

  if (objective.kind === "antigensAtLeast") {
    return `${Math.floor(state.resources.antigens)}/${objective.value}`;
  }

  if (objective.kind === "researchComplete") {
    return isObjectiveComplete(state, objective) ? "complete" : "non";
  }

  if (objective.kind === "infectedCellsAtMost") {
    return `${getInfectedCellCount(state)}/${objective.value}`;
  }

  if (objective.kind === "inflammationBelow") {
    return `${Math.ceil(state.missionStats.peakInflammation)}/${objective.value}`;
  }

  if (objective.kind === "unitProduced") {
    return `${state.missionStats.producedUnits[objective.unitTypeId] ?? 0}/1`;
  }

  if (objective.kind === "abilityUsed") {
    return `${state.missionStats.usedAbilities[objective.abilityId] ?? 0}/1`;
  }

  return "";
}

function getInfectedCellCount(state: GameState): number {
  return state.tissueCells.filter((cell) => cell.status === "infected").length;
}
