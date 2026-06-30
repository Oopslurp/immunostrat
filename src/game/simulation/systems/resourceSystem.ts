import { balanceValues } from "../../data/balance";
import { pathogenDefinitions } from "../../data/pathogens";
import type { GameState } from "../core/GameState";
import { isBacterium, isVirus } from "../entities";

export function applyResourceSystem(state: GameState, deltaMs: number): void {
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
    state.resources.atp + balanceValues.passiveAtpPerSecond * (deltaMs / 1000),
  );
  state.resources.cytokines = Math.min(
    balanceValues.maxCytokines,
    state.resources.cytokines +
      (balanceValues.passiveCytokinesPerSecond +
        bacteriaPressure * balanceValues.cytokinesPerBacteriumPerSecond +
        (virusPressure + infectedPressure) *
          balanceValues.cytokinesPerBacteriumPerSecond *
          0.55) *
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
