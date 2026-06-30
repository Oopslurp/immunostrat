import { treatmentDefinitions } from "../../data/treatments";
import type { GameState } from "../core/GameState";

export function applyTreatmentSystem(state: GameState, deltaMs: number): void {
  for (const treatmentId of Object.keys(treatmentDefinitions)) {
    const id = treatmentId as keyof typeof treatmentDefinitions;

    state.treatments.cooldowns[id] = Math.max(
      0,
      (state.treatments.cooldowns[id] ?? 0) - deltaMs,
    );
    state.treatments.activeMs[id] = Math.max(
      0,
      (state.treatments.activeMs[id] ?? 0) - deltaMs,
    );
  }
}

export function isTreatmentActive(
  state: GameState,
  treatmentId: keyof typeof treatmentDefinitions,
): boolean {
  return (state.treatments.activeMs[treatmentId] ?? 0) > 0;
}
