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
      cytokines: balanceValues.startingCytokines,
      antigens: balanceValues.startingAntigens,
    },
    inflammation: {
      value: balanceValues.inflammation.startingValue,
    },
    inflammatoryZones: [],
    productionCooldowns: {
      neutrophilMs: 0,
      massiveNeutralizationMs: 0,
    },
    adaptiveResearch: {
      bacterialAnalysisComplete: false,
    },
    debris: [],
    waves: {
      currentWaveIndex: 0,
      spawnedInCurrentWave: 0,
    },
    entities: {},
    selectedEntityIds: [],
    nextEntityNumber: 1,
    nextEffectNumber: 1,
    nextDebrisNumber: 1,
    effects: [],
  };
}
