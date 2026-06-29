import { balanceValues } from "../../data/balance";
import type { GameState } from "../core/GameState";

export function applyResourceSystem(state: GameState, deltaMs: number): void {
  state.resources.atp = Math.min(
    balanceValues.maxAtp,
    state.resources.atp + balanceValues.passiveAtpPerSecond * (deltaMs / 1000),
  );
}
