import { balanceValues } from "../../data/balance";
import type { GameState } from "../core/GameState";
import { isBacterium } from "../entities";

export function applyResourceSystem(state: GameState, deltaMs: number): void {
  const bacteriaCount = Object.values(state.entities).filter(isBacterium).length;

  state.resources.atp = Math.min(
    balanceValues.maxAtp,
    state.resources.atp + balanceValues.passiveAtpPerSecond * (deltaMs / 1000),
  );
  state.resources.cytokines = Math.min(
    balanceValues.maxCytokines,
    state.resources.cytokines +
      (balanceValues.passiveCytokinesPerSecond +
        bacteriaCount * balanceValues.cytokinesPerBacteriumPerSecond) *
        (deltaMs / 1000),
  );
  state.productionCooldowns.neutrophilMs = Math.max(
    0,
    state.productionCooldowns.neutrophilMs - deltaMs,
  );
}
