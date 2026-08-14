import { balanceValues } from "../../data/balance";
import {
  getActiveInfiniteMutators,
  getInfiniteCycle,
  infiniteDifficultySettings,
} from "../../data/infiniteMode";
import { pathogenDefinitions } from "../../data/pathogens";
import { missionDefinitions } from "../../data/missions";
import type { GameState } from "../core/GameState";
import { isBacterium, isVirus } from "../entities";
import { getRuntimeMapBalance } from "./runtimeMapBalance";

export type ResourceIncomeRates = {
  atp: number;
  cytokines: number;
  antigens: number;
};

export function getResourceIncomeRates(state: GameState): ResourceIncomeRates {
  const mission = missionDefinitions[state.missionId];
  const mapBalance = getRuntimeMapBalance(state);
  const infiniteDifficultyMultiplier =
    mission.mode === "infinite"
      ? infiniteDifficultySettings[
          state.preparation.infiniteDifficulty ?? "normal"
        ].resourceMultiplier
      : 1;
  const infiniteMutatorMultiplier =
    mission.mode === "infinite" &&
    getActiveInfiniteMutators(
      getInfiniteCycle(state.waves.currentWaveIndex + 1),
      state.preparation.infiniteDifficulty ?? "normal",
    ).some((mutator) => mutator.id === "resourceProductionDown")
      ? 0.84
      : 1;
  const incomeMultiplier =
    mapBalance.resourceIncomeModifier *
    infiniteDifficultyMultiplier *
    infiniteMutatorMultiplier;
  const bacteriaPressure = Object.values(state.entities)
    .filter(isBacterium)
    .reduce((pressure, bacterium) => {
      const definition = pathogenDefinitions[bacterium.pathogenTypeId];

      return pressure + (bacterium.inflammationPressureMultiplier ?? definition.inflammationPressureMultiplier);
    }, 0);
  const virusPressure = Object.values(state.entities).filter(isVirus).length * 0.35;
  const infectedPressure =
    state.tissueCells.filter((cell) => cell.status === "infected").length * 0.45;
  const dendriticCount = Object.values(state.entities).filter(
    (entity) => entity.kind === "dendriticCell",
  ).length;
  const antigenEconomyUnlocked = mission.unlockedUnits.includes("dendriticCell");
  const dendriticAntigenBonus =
    Math.min(dendriticCount, balanceValues.passiveAntigenDendriticCap) *
    balanceValues.passiveAntigensPerDendriticPerSecond;

  return {
    atp: balanceValues.passiveAtpPerSecond * incomeMultiplier,
    cytokines:
      (balanceValues.passiveCytokinesPerSecond +
        bacteriaPressure * balanceValues.cytokinesPerBacteriumPerSecond +
        (virusPressure + infectedPressure) *
          balanceValues.cytokinesPerBacteriumPerSecond *
          0.55) *
      incomeMultiplier,
    antigens: antigenEconomyUnlocked
      ? (balanceValues.passiveAntigensPerSecond + dendriticAntigenBonus) *
        incomeMultiplier
      : 0,
  };
}

export function applyResourceSystem(state: GameState, deltaMs: number): void {
  const incomeRates = getResourceIncomeRates(state);
  const elapsedSeconds = deltaMs / 1000;

  state.resources.atp = Math.min(
    balanceValues.maxAtp,
    state.resources.atp + incomeRates.atp * elapsedSeconds,
  );
  state.resources.cytokines = Math.min(
    balanceValues.maxCytokines,
    state.resources.cytokines + incomeRates.cytokines * elapsedSeconds,
  );
  state.resources.antigens = Math.min(
    balanceValues.maxAntigens,
    state.resources.antigens + incomeRates.antigens * elapsedSeconds,
  );
  state.productionCooldowns.neutrophilMs = Math.max(
    0,
    state.productionCooldowns.neutrophilMs - deltaMs,
  );
  state.productionCooldowns.massiveNeutralizationMs = Math.max(
    0,
    state.productionCooldowns.massiveNeutralizationMs - deltaMs,
  );
  state.productionCooldowns.antiviralSignalMs = Math.max(
    0,
    state.productionCooldowns.antiviralSignalMs - deltaMs,
  );
}
