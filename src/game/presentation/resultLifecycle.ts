import type { MissionId } from "../data/missions";
import type { GameStatus } from "../types/shared";

export function getResultProcessingKey(
  snapshotMissionId: MissionId,
  currentMissionId: MissionId,
  sessionGeneration: number,
  status: GameStatus,
): string | null {
  if (snapshotMissionId !== currentMissionId || status === "running") {
    return null;
  }

  return `${currentMissionId}-${sessionGeneration}-${status}`;
}

export function canRetryBattleResult(
  battleSource: "campaign" | "bodyMap" | "infinite",
  canRestartBattle: boolean,
): boolean {
  return canRestartBattle && battleSource !== "bodyMap";
}
