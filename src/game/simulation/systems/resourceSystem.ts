import { balanceValues } from "../../data/balance";
import { pathogenDefinitions } from "../../data/pathogens";
import type { GameState } from "../core/GameState";
import { isBacterium } from "../entities";

export function applyResourceSystem(state: GameState, deltaMs: number): void {
  const bacteriaPressure = Object.values(state.entities)
    .filter(isBacterium)
    .reduce((pressure, bacterium) => {
      const definition = pathogenDefinitions[bacterium.pathogenTypeId];

      return pressure + (bacterium.inflammationPressureMultiplier ?? definition.inflammationPressureMultiplier);
    }, 0);

  state.resources.atp = Math.min(
    balanceValues.maxAtp,
    state.resources.atp + balanceValues.passiveAtpPerSecond * (deltaMs / 1000),
  );
  state.resources.cytokines = Math.min(
    balanceValues.maxCytokines,
    state.resources.cytokines +
      (balanceValues.passiveCytokinesPerSecond +
        bacteriaPressure * balanceValues.cytokinesPerBacteriumPerSecond) *
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
}
