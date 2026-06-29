import type { GameState } from "../core/GameState";

export function applyEffectSystem(state: GameState, deltaMs: number): void {
  state.effects = state.effects
    .map((effect) => ({
      ...effect,
      ttlMs: effect.ttlMs - deltaMs,
    }))
    .filter((effect) => effect.ttlMs > 0);
}
