import { balanceValues } from "../../data/balance";
import { getActiveInfiniteMutators, getInfiniteCycle } from "../../data/infiniteMode";
import { pathogenDefinitions } from "../../data/pathogens";
import { missionDefinitions } from "../../data/missions";
import type { GameState } from "../core/GameState";
import { isBacterium, isVirus } from "../entities";
import { getRuntimeMapBalance } from "./runtimeMapBalance";

export function applyResourceSystem(state: GameState, deltaMs: number): void {
  const mission = missionDefinitions[state.missionId];
  const mapBalance = getRuntimeMapBalance(state);
  const infiniteResourceMultiplier =
    mission.mode === "infinite" &&
    getActiveInfiniteMutators(
      getInfiniteCycle(state.waves.currentWaveIndex + 1),
      state.preparation.infiniteDifficulty ?? "normal",
    ).some((mutator) => mutator.id === "resourceProductionDown")
      ? 0.84
      : 1;
  const bacteriaPressure = Object.values(state.entities)
    .filter(isBacterium)
    .reduce((pressure, bacterium) => {
      const definition = pathogenDefinitions[bacterium.pathogenTypeId];

      return pressure + (bacterium.inflammationPressureMultiplier ?? definition.inflammationPressureMultiplier);
    }, 0);
  const virusPressure = Object.values(state.entities).filter(isVirus).length * 0.35;
  const infectedPressure =
    state.tissueCells.filter((cell) => cell.status === "infected").length * 0.45;

  state.resources.atp = Math.min(
    balanceValues.maxAtp,
    state.resources.atp +
      balanceValues.passiveAtpPerSecond *
        mapBalance.resourceIncomeModifier *
        infiniteResourceMultiplier *
        (deltaMs / 1000),
  );
  state.resources.cytokines = Math.min(
    balanceValues.maxCytokines,
    state.resources.cytokines +
        (balanceValues.passiveCytokinesPerSecond +
        bacteriaPressure * balanceValues.cytokinesPerBacteriumPerSecond +
        (virusPressure + infectedPressure) *
          balanceValues.cytokinesPerBacteriumPerSecond *
          0.55) *
        mapBalance.resourceIncomeModifier *
        infiniteResourceMultiplier *
        (deltaMs / 1000),
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
