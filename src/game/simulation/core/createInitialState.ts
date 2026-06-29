import { balanceValues } from "../../data/balance";
import type { MissionId } from "../../data/missions";
import type { GameState } from "./GameState";

export function createInitialState(
  missionId: MissionId = "woundBacteriaV1",
): GameState {
  return {
    missionId,
    elapsedMs: 0,
    status: "running",
    tissue: {
      health: balanceValues.startingTissueHealth,
      maxHealth: balanceValues.startingTissueHealth,
    },
    resources: {
      atp: balanceValues.startingAtp,
    },
    waves: {
      currentWaveIndex: 0,
      spawnedInCurrentWave: 0,
    },
    entities: {},
    selectedEntityIds: [],
    nextEntityNumber: 1,
    nextEffectNumber: 1,
    effects: [],
  };
}
