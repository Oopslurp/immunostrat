import { cloneState } from "./cloneState";
import type { GameState } from "./GameState";
import { applyCombatSystem } from "../systems/combatSystem";
import { applyEndConditionSystem } from "../systems/endConditionSystem";
import { applyEffectSystem } from "../systems/effectSystem";
import { applyInflammationSystem } from "../systems/inflammationSystem";
import { applyMovementSystem } from "../systems/movementSystem";
import { applyResourceSystem } from "../systems/resourceSystem";
import { applyTissueSystem } from "../systems/tissueSystem";
import { applyWaveSystem } from "../systems/waveSystem";

export function stepSimulation(state: GameState, deltaMs: number): GameState {
  if (state.status !== "running") {
    return state;
  }

  const next = cloneState(state);
  next.elapsedMs += deltaMs;

  applyResourceSystem(next, deltaMs);
  applyEffectSystem(next, deltaMs);
  applyWaveSystem(next);
  applyMovementSystem(next, deltaMs);
  applyCombatSystem(next, deltaMs);
  applyTissueSystem(next, deltaMs);
  applyInflammationSystem(next, deltaMs);
  applyEndConditionSystem(next);

  next.selectedEntityIds = next.selectedEntityIds.filter(
    (entityId) => {
      const entity = next.entities[entityId];

      return entity?.kind === "macrophage" || entity?.kind === "neutrophil";
    },
  );

  return next;
}
